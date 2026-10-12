import { type ReactNode, useState } from "react";
import { devtoolsTransport } from "../../../sessions/api/session-transports";
import {
  SessionWorkspaceProvider,
  useWorkspaceLoader,
  type WorkspaceState,
} from "../../../sessions/ui/session-workspace";
import {
  type SessionNavigation,
  SessionsPanel,
} from "../../../sessions/ui/sessions-panel";
import type { SessionTarget } from "../../../sessions/ui/start/session-list";
import { MissingRouteHint } from "../route/route-hint";
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
  const [open, setOpen] = useState<SessionTarget | null>(null);
  return { navigation: { onOpen: setOpen, open }, state };
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

function ConnectHint({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="dt-empty">
      <p>
        Sessions are saved under your Reflet account. Connect in the Board tab.
      </p>
      <button className="dt-btn" onClick={onConnect} type="button">
        Open the Board tab
      </button>
    </div>
  );
}

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
  onConnect: () => void;
  onStarted: () => void;
  onWriteNote?: () => void;
}

export function SessionsTab({
  actions,
  route,
  sessions,
}: {
  actions: SessionsTabActions;
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
    return <ConnectHint onConnect={actions.onConnect} />;
  }
  if (board.kind === "secretKey") {
    return (
      <p className="dt-empty">
        Sessions are recorded under your own name, so they need Connect in the
        Board tab rather than REFLET_SECRET_KEY.
      </p>
    );
  }
  return <WorkspaceGate actions={actions} sessions={sessions} />;
}
