import type { ReactNode } from "react";
import { devtoolsTransport } from "../../../sessions/api/session-transports";
import {
  SessionWorkspaceProvider,
  useWorkspaceLoader,
  type WorkspaceState,
} from "../../../sessions/ui/session-workspace";
import {
  type SessionNavigation,
  SessionsPanel,
  useSessionNavigation,
} from "../../../sessions/ui/sessions-panel";
import { CONNECT_REQUIREMENT, MissingRouteHint } from "../route/route-hint";
import type { DevRouteState } from "../route/use-dev-route";

const DEVTOOLS_TRANSPORT = devtoolsTransport();

export interface DevtoolsSessions {
  navigation: SessionNavigation;
  state: WorkspaceState;
}

/** Sessions go through the dev route with the developer's own Connect token, never the secret key. */
export function useDevtoolsSessions(options: {
  onUnauthorized: () => void;
  route: DevRouteState;
}): DevtoolsSessions {
  const { route } = options;
  const isConnected =
    route.kind === "ready" && route.status.board.kind === "connected";
  const state = useWorkspaceLoader({
    onUnauthorized: options.onUnauthorized,
    surface: "devtools",
    transport: isConnected ? DEVTOOLS_TRANSPORT : null,
  });
  return { navigation: useSessionNavigation(), state };
}

export function SessionsScope({
  children,
  sessions,
}: {
  children: ReactNode;
  sessions: DevtoolsSessions;
}) {
  const workspace =
    sessions.state.kind === "ready" ? sessions.state.workspace : null;
  return (
    <SessionWorkspaceProvider workspace={workspace}>
      {children}
    </SessionWorkspaceProvider>
  );
}

const SESSIONS_NEED_ACCOUNT =
  "Sessions are recorded under your Reflet account.";

function WorkspaceGate({
  actions,
  sessions,
}: {
  actions: SessionsTabActions;
  sessions: DevtoolsSessions;
}) {
  const { state } = sessions;
  if (state.kind === "ready") {
    return (
      <SessionsPanel
        navigation={sessions.navigation}
        onStarted={actions.onStarted}
        onWriteNote={actions.onWriteNote}
      />
    );
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

export interface SessionsTabActions {
  onStarted: () => void;
  onWriteNote?: () => void;
}

export function SessionsTab({
  actions,
  canConnect,
  route,
  sessions,
}: {
  actions: SessionsTabActions;
  canConnect: boolean;
  route: DevRouteState;
  sessions: DevtoolsSessions;
}) {
  if (route.kind === "checking") {
    return <p className="dt-status">Connecting to the Reflet dev route…</p>;
  }
  if (route.kind === "missing") {
    return (
      <MissingRouteHint purpose="record sessions under your Reflet account" />
    );
  }
  const { board } = route.status;
  if (board.kind === "disconnected") {
    return (
      <p className="dt-empty">
        {SESSIONS_NEED_ACCOUNT}{" "}
        {canConnect
          ? "Connect to Reflet below to start one."
          : CONNECT_REQUIREMENT}
      </p>
    );
  }
  if (board.kind === "secretKey") {
    return (
      <p className="dt-empty">
        {SESSIONS_NEED_ACCOUNT} REFLET_SECRET_KEY can't stand for you: remove it
        from the dev server environment, then connect to Reflet.
      </p>
    );
  }
  return <WorkspaceGate actions={actions} sessions={sessions} />;
}
