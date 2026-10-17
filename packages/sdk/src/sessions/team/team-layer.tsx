import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AccountFooter } from "../../devtools/client/account/account-footer";
import {
  DevtoolsBar,
  SessionsBarButton,
} from "../../devtools/client/devtools-bar";
import { DevtoolsSheet } from "../../devtools/client/devtools-sheet";
import { DEVTOOLS_STYLES } from "../../devtools/client/devtools-styles";
import { Notices, reportFailure } from "../../devtools/client/notices";
import type { RefletFeedbackProps } from "../../feedback/types";
import type { SessionTransport } from "../api/session-api";
import { bridgeTransport, teamTransport } from "../api/session-transports";
import { purgeAccount } from "../local/local-sessions";
import { RecordingLayer } from "../ui/recording/recording-layer";
import {
  failureMessage,
  SessionWorkspaceProvider,
  useWorkspaceLoader,
  type WorkspaceState,
} from "../ui/session-workspace";
import {
  type SessionNavigation,
  SessionsPanel,
  sessionSheetPlace,
  useSessionNavigation,
} from "../ui/sessions-panel";
import { SESSIONS_STYLES } from "../ui/sessions-styles";
import {
  finishTeamSignIn,
  forgetTeamAccess,
  hasTeamSignInReturn,
  prepareTeamSignIn,
  readTeamAccess,
} from "./team-auth";
import { type TeamConnection, TeamSignInCard } from "./team-sign-in-card";
import type { TeamToolsAccount, TeamToolsBridge } from "./team-tools-bridge";

const TEAM_TOOLS_LABEL = "Reflet team tools";
const REFUSED_SIGN_IN_COPY =
  "Reflet no longer accepts this sign-in. Sign in again to record.";

interface TeamPlacement {
  edge: "bottom" | "top";
  side: "left" | "right";
}

interface SignedInTeam {
  onSignOut: (reason: string | null) => void;
  organizationName: string;
  transport: SessionTransport;
}

function SessionsBody({
  navigation,
  onStarted,
  state,
}: {
  navigation: SessionNavigation;
  onStarted: () => void;
  state: WorkspaceState;
}) {
  if (state.kind === "ready") {
    return <SessionsPanel navigation={navigation} onStarted={onStarted} />;
  }
  if (state.kind === "failed") {
    return (
      <div className="dt-empty" role="alert">
        <p>Sessions did not open: {state.message}</p>
        <button className="dt-btn" onClick={state.retry} type="button">
          Try again
        </button>
      </div>
    );
  }
  return <p className="dt-status">Opening your sessions…</p>;
}

function TeamSheet({
  account,
  navigation,
  onClose,
  side,
}: {
  account: {
    onSignOut: () => void;
    organizationName: string;
    state: WorkspaceState;
  };
  navigation: SessionNavigation;
  onClose: () => void;
  side: TeamPlacement["side"];
}) {
  const { state } = account;
  const place = state.kind === "ready" ? sessionSheetPlace(navigation) : null;
  return (
    <DevtoolsSheet
      footer={
        place === null && (
          <AccountFooter
            actions={[{ label: "Sign out", onSelect: account.onSignOut }]}
            organizationName={account.organizationName}
            person={
              state.kind === "ready" ? state.workspace.identity.user : null
            }
          />
        )
      }
      label={TEAM_TOOLS_LABEL}
      navigation={{
        onSelectTab: () => undefined,
        place,
        tab: "sessions",
        tabs: ["sessions"],
      }}
      onClose={onClose}
      side={side}
    >
      <SessionsBody navigation={navigation} onStarted={onClose} state={state} />
    </DevtoolsSheet>
  );
}

function useTeamWorkspace(team: SignedInTeam) {
  const { onSignOut } = team;
  const state = useWorkspaceLoader({
    onUnauthorized: () => onSignOut(REFUSED_SIGN_IN_COPY),
    surface: "app",
    transport: team.transport,
  });
  const workspace = state.kind === "ready" ? state.workspace : null;

  const signOut = async () => {
    if (workspace) {
      await purgeAccount(workspace.account.key).catch((error: unknown) =>
        reportFailure("This device's session data was not removed", error)
      );
    }
    onSignOut(null);
  };

  return { signOut, state, workspace };
}

function TeamTools({
  team,
  placement,
}: {
  placement: TeamPlacement;
  team: SignedInTeam;
}) {
  const { signOut, state, workspace } = useTeamWorkspace(team);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const navigation = useSessionNavigation();

  return (
    <SessionWorkspaceProvider workspace={workspace}>
      {isSheetOpen && (
        <TeamSheet
          account={{
            onSignOut: signOut,
            organizationName: team.organizationName,
            state,
          }}
          navigation={navigation}
          onClose={() => setIsSheetOpen(false)}
          side={placement.side}
        />
      )}
      <DevtoolsBar
        edge={placement.edge}
        label={TEAM_TOOLS_LABEL}
        side={placement.side}
      >
        <SessionsBarButton onOpen={() => setIsSheetOpen(true)} />
      </DevtoolsBar>
      {workspace && (
        <RecordingLayer
          onFinished={(target) => {
            navigation.go({ target, view: "review" });
            setIsSheetOpen(true);
          }}
        />
      )}
    </SessionWorkspaceProvider>
  );
}

function SignedOutAnchor({
  children,
  placement,
}: {
  children: ReactNode;
  placement: TeamPlacement;
}) {
  return (
    <div
      className="dt-team-anchor"
      data-edge={placement.edge}
      data-side={placement.side}
    >
      {children}
    </div>
  );
}

/** A web page signs in by leaving for reflet.app and coming back with a token for its own origin. */
function BrowserTeamAccount({
  connection,
  placement,
}: {
  connection: TeamConnection;
  placement: TeamPlacement;
}) {
  const { apiUrl, publicKey } = connection;
  const [access, setAccess] = useState(() => readTeamAccess(publicKey));
  const [notice, setNotice] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(hasTeamSignInReturn);
  const transport = useMemo(
    () => access && teamTransport({ apiUrl, token: access.token }),
    [access, apiUrl]
  );
  useEffect(() => {
    finishTeamSignIn({ apiUrl, publicKey })
      ?.then(
        (signedIn) => {
          setAccess(signedIn);
          setNotice(null);
        },
        (error: unknown) => setNotice(failureMessage(error))
      )
      .finally(() => setIsFinishing(false));
  }, [apiUrl, publicKey]);
  const signOut = (reason: string | null) => {
    setAccess(null);
    setNotice(reason);
    forgetTeamAccess({ apiUrl, publicKey }).catch((error: unknown) =>
      reportFailure("Signing out of Reflet did not finish", error)
    );
  };

  if (access && transport) {
    return (
      <TeamTools
        placement={placement}
        team={{
          onSignOut: signOut,
          organizationName: access.organizationName,
          transport,
        }}
      />
    );
  }
  return (
    <SignedOutAnchor placement={placement}>
      <TeamSignInCard
        continuesInBrowser={false}
        isFinishing={isFinishing}
        notice={notice}
        onSignIn={async () =>
          window.location.assign(await prepareTeamSignIn(connection))
        }
      />
    </SignedOutAnchor>
  );
}

type BridgeAccountState =
  | { kind: "loading" }
  | { account: TeamToolsAccount | null; kind: "loaded" };

/** A desktop app signs in through the system browser; its privileged process keeps the credential. */
function BridgeTeamAccount({
  bridge,
  placement,
}: {
  bridge: TeamToolsBridge;
  placement: TeamPlacement;
}) {
  const [accountState, setAccountState] = useState<BridgeAccountState>({
    kind: "loading",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const transport = useMemo(() => bridgeTransport(bridge), [bridge]);
  useEffect(() => {
    let isCurrent = true;
    bridge.account().then(
      (account) => isCurrent && setAccountState({ account, kind: "loaded" }),
      (error: unknown) => {
        if (isCurrent) {
          setAccountState({ account: null, kind: "loaded" });
          setNotice(failureMessage(error));
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [bridge]);
  const signIn = async () => {
    const account = await bridge.signIn();
    setAccountState({ account, kind: "loaded" });
    setNotice(null);
  };
  const signOut = (reason: string | null) => {
    setAccountState({ account: null, kind: "loaded" });
    setNotice(reason);
    bridge
      .signOut()
      .catch((error: unknown) =>
        reportFailure("Signing out of Reflet did not finish", error)
      );
  };

  if (accountState.kind === "loading") {
    return null;
  }
  if (accountState.account) {
    return (
      <TeamTools
        placement={placement}
        team={{
          onSignOut: signOut,
          organizationName: accountState.account.organizationName,
          transport,
        }}
      />
    );
  }
  return (
    <SignedOutAnchor placement={placement}>
      <TeamSignInCard
        continuesInBrowser
        isFinishing={false}
        notice={notice}
        onSignIn={signIn}
      />
    </SignedOutAnchor>
  );
}

function placementFor(
  position: NonNullable<RefletFeedbackProps["position"]>
): TeamPlacement {
  return {
    edge: position.startsWith("top") ? "top" : "bottom",
    side: position.endsWith("right") ? "right" : "left",
  };
}

export function TeamLayer(
  props: { position: NonNullable<RefletFeedbackProps["position"]> } & (
    | { bridge: TeamToolsBridge }
    | { connection: TeamConnection }
  )
) {
  const placement = placementFor(props.position);
  return (
    <div className="dt">
      <style>{`${DEVTOOLS_STYLES}${SESSIONS_STYLES}`}</style>
      {"bridge" in props ? (
        <BridgeTeamAccount bridge={props.bridge} placement={placement} />
      ) : (
        <BrowserTeamAccount
          connection={props.connection}
          placement={placement}
        />
      )}
      <Notices />
    </div>
  );
}
