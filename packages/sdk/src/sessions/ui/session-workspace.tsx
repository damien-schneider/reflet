import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { reportFailure } from "../../devtools/client/notices";
import {
  createSessionApi,
  type SessionApi,
  SessionApiError,
  type SessionTransport,
} from "../api/session-api";
import { purgeAccount, useSyncStatus } from "../local/local-sessions";
import type { SessionAccount } from "../local/session-store";
import type { SessionIdentity, SessionSurface } from "../protocol";
import {
  createSessionRecorder,
  type SessionRecorder,
} from "../recorder/session-recorder";
import { useRecorderSnapshot } from "../recorder/use-recorder-snapshot";

export interface SessionWorkspace {
  account: SessionAccount;
  api: SessionApi;
  identity: SessionIdentity;
  onUnauthorized: () => void;
  recorder: SessionRecorder;
  surface: SessionSurface;
}

export type WorkspaceState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "failed"; message: string; retry: () => void }
  | { kind: "ready"; workspace: SessionWorkspace };

export const UNAUTHORIZED_MESSAGE =
  "Reflet no longer accepts this connection, so recording stopped and this device's unsent session data was removed.";

export function isUnauthorized(error: unknown): boolean {
  return error instanceof SessionApiError && error.status === 401;
}

export function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

function accountFor(identity: SessionIdentity): SessionAccount {
  return {
    key: `${identity.organizationId}:${identity.user.id}`,
    organizationName: identity.organizationName,
    userEmail: identity.user.email,
    userName: identity.user.name,
  };
}

async function openWorkspace(options: {
  onRefused: (account: SessionAccount) => void;
  surface: SessionSurface;
  transport: SessionTransport;
}): Promise<SessionWorkspace> {
  const { surface } = options;
  const api = createSessionApi(options.transport);
  const identity = await api.identity();
  const account = accountFor(identity);
  const recorder = createSessionRecorder({
    account,
    api,
    limits: surface === "live" ? identity.liveLimits : identity.limits,
    surface,
  });
  return {
    account,
    api,
    identity,
    onUnauthorized: () => options.onRefused(account),
    recorder,
    surface,
  };
}

function loadWorkspace(options: {
  onUnauthorized: () => void;
  setState: (state: WorkspaceState) => void;
  surface: SessionSurface;
  transport: SessionTransport;
}): () => void {
  const { setState, surface, transport } = options;
  let isCurrent = true;
  let opened: SessionWorkspace | null = null;
  const showFailure = (message: string) => {
    if (isCurrent) {
      setState({ kind: "failed", message, retry: load });
    }
  };
  const refuse = (account: SessionAccount | null) => {
    opened?.recorder.dispose();
    if (account) {
      purgeAccount(account.key).catch((error: unknown) =>
        reportFailure("This device's session data was not removed", error)
      );
    }
    showFailure(UNAUTHORIZED_MESSAGE);
    options.onUnauthorized();
  };
  const load = () => {
    setState({ kind: "loading" });
    openWorkspace({ onRefused: refuse, surface, transport }).then(
      (workspace) => {
        opened = workspace;
        if (isCurrent) {
          setState({ kind: "ready", workspace });
        } else {
          workspace.recorder.dispose();
        }
      },
      (error: unknown) => {
        if (isUnauthorized(error)) {
          refuse(null);
        } else {
          showFailure(failureMessage(error));
        }
      }
    );
  };
  load();
  return () => {
    isCurrent = false;
    opened?.recorder.dispose();
  };
}

export function useWorkspaceLoader(options: {
  onUnauthorized: () => void;
  surface: SessionSurface;
  transport: SessionTransport | null;
}): WorkspaceState {
  const { surface, transport } = options;
  const [state, setState] = useState<WorkspaceState>({ kind: "idle" });
  const onUnauthorizedRef = useRef(options.onUnauthorized);
  useLayoutEffect(() => {
    onUnauthorizedRef.current = options.onUnauthorized;
  });

  useEffect(() => {
    if (!transport) {
      setState({ kind: "idle" });
      return;
    }
    return loadWorkspace({
      onUnauthorized: () => onUnauthorizedRef.current(),
      setState,
      surface,
      transport,
    });
  }, [surface, transport]);

  return state;
}

const WorkspaceContext = createContext<SessionWorkspace | null>(null);

function RefusedCredentialWatch({
  workspace,
}: {
  workspace: SessionWorkspace;
}) {
  const snapshot = useRecorderSnapshot(workspace.recorder);
  const sync = useSyncStatus(workspace.account.key);
  const isRefused =
    snapshot.failure?.kind === "auth" || sync.blockedBy === "auth";
  const { onUnauthorized } = workspace;
  useEffect(() => {
    if (isRefused) {
      onUnauthorized();
    }
  }, [isRefused, onUnauthorized]);
  return null;
}

export function SessionWorkspaceProvider({
  children,
  workspace,
}: {
  children: ReactNode;
  workspace: SessionWorkspace | null;
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {workspace && <RefusedCredentialWatch workspace={workspace} />}
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useSessionWorkspace(): SessionWorkspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) {
    throw new Error("Session views render inside SessionWorkspaceProvider.");
  }
  return workspace;
}

export function useSessionAction() {
  const { onUnauthorized } = useSessionWorkspace();
  return async <T,>(
    failureLabel: string,
    action: () => Promise<T>,
    retry?: () => void
  ): Promise<T | null> => {
    try {
      return await action();
    } catch (error) {
      if (isUnauthorized(error)) {
        onUnauthorized();
      } else {
        reportFailure(failureLabel, error, retry);
      }
      return null;
    }
  };
}
