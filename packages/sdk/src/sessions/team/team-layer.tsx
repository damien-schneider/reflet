import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEVTOOLS_STYLES } from "../../devtools/client/devtools-styles";
import { Notices, reportFailure } from "../../devtools/client/notices";
import type { BoardCall } from "../../devtools/client/route/dev-route";
import type { RefletFeedbackProps } from "../../feedback/types";
import { SessionApiError } from "../api/session-api";
import {
  bridgeBoardCall,
  bridgeTransport,
  teamTransport,
} from "../api/session-transports";
import { failureMessage } from "../ui/session-workspace";
import { SESSIONS_STYLES } from "../ui/sessions-styles";
import {
  finishTeamSignIn,
  forgetTeamAccess,
  hasTeamSignInReturn,
  prepareTeamSignIn,
  readTeamAccess,
} from "./team-auth";
import { type TeamConnection, TeamSignInCard } from "./team-sign-in-card";
import {
  REFUSED_SIGN_IN_COPY,
  type TeamPlacement,
  TeamTools,
} from "./team-tools";
import type { TeamToolsAccount, TeamToolsBridge } from "./team-tools-bridge";

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
          boardCall: null,
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

/** The host already dropped a token Reflet refuses, so later calls would only fail. */
function signsOutWhenRefused(
  boardCall: BoardCall,
  onRefused: () => void
): BoardCall {
  return async (apiPath, init) => {
    try {
      return await boardCall(apiPath, init);
    } catch (error) {
      if (error instanceof SessionApiError && error.status === 401) {
        onRefused();
      }
      throw error;
    }
  };
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
  const signOut = useCallback(
    (reason: string | null) => {
      setAccountState({ account: null, kind: "loaded" });
      setNotice(reason);
      bridge
        .signOut()
        .catch((error: unknown) =>
          reportFailure("Signing out of Reflet did not finish", error)
        );
    },
    [bridge]
  );
  const boardCall = useMemo(
    () =>
      signsOutWhenRefused(bridgeBoardCall(bridge), () =>
        signOut(REFUSED_SIGN_IN_COPY)
      ),
    [bridge, signOut]
  );

  if (accountState.kind === "loading") {
    return null;
  }
  if (accountState.account) {
    return (
      <TeamTools
        placement={placement}
        team={{
          boardCall,
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
