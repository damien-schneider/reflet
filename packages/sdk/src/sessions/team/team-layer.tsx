import { useEffect, useState } from "react";
import { AccountFooter } from "../../devtools/client/account/account-footer";
import {
  DevtoolsBar,
  SessionsBarButton,
} from "../../devtools/client/devtools-bar";
import { DevtoolsSheet } from "../../devtools/client/devtools-sheet";
import { DEVTOOLS_STYLES } from "../../devtools/client/devtools-styles";
import { Notices, reportFailure } from "../../devtools/client/notices";
import type { RefletFeedbackProps } from "../../feedback/types";
import { teamTransport } from "../api/session-transports";
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
  readTeamAccess,
  type TeamAccess,
} from "./team-auth";
import { type TeamConnection, TeamSignInCard } from "./team-sign-in-card";

const TEAM_TOOLS_LABEL = "Reflet team tools";
const REFUSED_SIGN_IN_COPY =
  "Reflet no longer accepts this sign-in. Sign in again to record.";

interface TeamPlacement {
  edge: "bottom" | "top";
  side: "left" | "right";
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
  account: { access: TeamAccess; onSignOut: () => void; state: WorkspaceState };
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
            organizationName={account.access.organizationName}
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

interface TeamSession {
  access: TeamAccess;
  apiUrl: string;
  onSignOut: (reason: string | null) => void;
}

function useTeamTransport(team: TeamSession) {
  const createTransport = () => ({
    apiUrl: team.apiUrl,
    transport: teamTransport({ apiUrl: team.apiUrl, token: team.access.token }),
  });
  const [current, setCurrent] = useState(createTransport);
  if (current.apiUrl !== team.apiUrl) {
    const next = createTransport();
    setCurrent(next);
    return next.transport;
  }
  return current.transport;
}

function useTeamWorkspace(team: TeamSession) {
  const { onSignOut } = team;
  const transport = useTeamTransport(team);
  const state = useWorkspaceLoader({
    onUnauthorized: () => onSignOut(REFUSED_SIGN_IN_COPY),
    surface: "app",
    transport,
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
  team: TeamSession;
}) {
  const { signOut, state, workspace } = useTeamWorkspace(team);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const navigation = useSessionNavigation();

  return (
    <SessionWorkspaceProvider workspace={workspace}>
      {isSheetOpen && (
        <TeamSheet
          account={{ access: team.access, onSignOut: signOut, state }}
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

function placementFor(
  position: NonNullable<RefletFeedbackProps["position"]>
): TeamPlacement {
  return {
    edge: position.startsWith("top") ? "top" : "bottom",
    side: position.endsWith("right") ? "right" : "left",
  };
}

export function TeamLayer({
  connection,
  position,
}: {
  connection: TeamConnection;
  position: NonNullable<RefletFeedbackProps["position"]>;
}) {
  const { apiUrl, publicKey } = connection;
  const [access, setAccess] = useState(() => readTeamAccess(publicKey));
  const [notice, setNotice] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(hasTeamSignInReturn);
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
  const placement = placementFor(position);

  return (
    <div className="dt">
      <style>{`${DEVTOOLS_STYLES}${SESSIONS_STYLES}`}</style>
      {access ? (
        <TeamTools
          placement={placement}
          team={{ access, apiUrl, onSignOut: signOut }}
        />
      ) : (
        <div
          className="dt-team-anchor"
          data-edge={placement.edge}
          data-side={placement.side}
        >
          <TeamSignInCard
            connection={connection}
            isFinishing={isFinishing}
            notice={notice}
          />
        </div>
      )}
      <Notices />
    </div>
  );
}
