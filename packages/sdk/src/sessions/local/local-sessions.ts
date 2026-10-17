import { useSyncExternalStore } from "react";
import type { SessionApi } from "../api/session-api";
import { createIndexedSessionStore } from "./indexed-session-store";
import { createOutbox, type Outbox } from "./outbox";
import type {
  LocalDraft,
  SessionLocalStore,
  StoredDraft,
  SyncSnapshot,
} from "./session-store";

const CHANGE_CHANNEL = "reflet-sessions";
const ACCESS_ENDED =
  "Your Reflet access ended, so recording stopped. Sign in again to record.";
const NO_DRAFTS: LocalDraft[] = [];
const IDLE_SYNC: SyncSnapshot = {
  blockedBy: null,
  isOnline: true,
  lastError: null,
  pendingBytes: 0,
  pendingOperations: 0,
};

export interface LiveRecording {
  halt: (failure: { kind: "auth"; message: string }) => void;
  sessionKey: string;
}

export interface AccountSessions {
  claim: (recording: LiveRecording) => () => void;
  outbox: Outbox;
  refreshDrafts: () => void;
  store: SessionLocalStore;
}

export interface LocalSessions {
  connect: (options: {
    accountKey: string;
    api: SessionApi;
    maxLocalBufferBytes: number | null;
  }) => AccountSessions;
  discardDraft: (options: {
    accountKey: string;
    api: SessionApi;
    sessionKey: string;
  }) => Promise<void>;
  getDrafts: (accountKey: string) => LocalDraft[];
  getSyncSnapshot: (accountKey: string) => SyncSnapshot;
  purgeAccount: (accountKey: string) => Promise<void>;
  refreshDrafts: (accountKey: string) => void;
  subscribe: (listener: () => void) => () => void;
  subscribeDrafts: (accountKey: string, listener: () => void) => () => void;
}

interface ConnectedAccount {
  api: SessionApi;
  maxLocalBufferBytes: number;
  outbox: Outbox;
  stopped: boolean;
}

function visibleDraft(stored: StoredDraft, isLive: boolean): LocalDraft[] {
  if (stored.state === "cancelled") {
    return [];
  }
  const leftOpen = stored.state === "recording" || stored.state === "paused";
  return [
    {
      lastActiveAt: stored.lastActiveAt,
      sessionId: stored.sessionId,
      sessionKey: stored.sessionKey,
      startedAt: stored.startedAt,
      state: leftOpen && !isLive ? "interrupted" : stored.state,
      title: stored.title,
    },
  ];
}

class LocalSessionsRegistry implements LocalSessions {
  private readonly accounts = new Map<string, ConnectedAccount>();
  private readonly channel =
    typeof window === "undefined" || typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(CHANGE_CHANNEL);
  private readonly drafts = new Map<string, LocalDraft[]>();
  private readonly listeners = new Set<() => void>();
  private readonly live = new Map<
    string,
    LiveRecording & { accountKey: string }
  >();
  private readonly store: SessionLocalStore;

  constructor(store: SessionLocalStore) {
    this.store = store;
    this.channel?.addEventListener("message", () => {
      for (const accountKey of this.drafts.keys()) {
        this.refreshDrafts(accountKey);
      }
    });
  }

  connect(options: {
    accountKey: string;
    api: SessionApi;
    maxLocalBufferBytes: number | null;
  }): AccountSessions {
    const { accountKey } = options;
    const connected = this.ensureOutbox(options);
    return {
      claim: (recording) => {
        this.live.set(recording.sessionKey, { ...recording, accountKey });
        this.refreshDrafts(accountKey);
        return () => {
          this.live.delete(recording.sessionKey);
          this.refreshDrafts(accountKey);
        };
      },
      outbox: connected.outbox,
      refreshDrafts: () => this.draftsChanged(accountKey),
      store: this.store,
    };
  }

  async discardDraft(options: {
    accountKey: string;
    api: SessionApi;
    sessionKey: string;
  }): Promise<void> {
    const { accountKey, sessionKey } = options;
    const stored = (await this.store.readDrafts(accountKey)).find(
      (candidate) => candidate.sessionKey === sessionKey
    );
    const isClosed = stored?.state === "ended" || stored?.state === "cancelled";
    if (!stored || this.live.has(sessionKey) || isClosed) {
      return;
    }
    const { outbox } = this.ensureOutbox({
      ...options,
      maxLocalBufferBytes: null,
    });
    const atMs = Math.max(0, stored.lastActiveAt - stored.startedAt);
    await outbox.enqueue(sessionKey, {
      action: "end",
      atMs,
      kind: "collection",
      reason: "interrupted",
    });
    await outbox.enqueue(sessionKey, { kind: "analyze" });
    await this.store.patchDraft(sessionKey, { state: "ended" });
    this.draftsChanged(accountKey);
  }

  getDrafts = (accountKey: string): LocalDraft[] =>
    this.drafts.get(accountKey) ?? NO_DRAFTS;

  getSyncSnapshot = (accountKey: string): SyncSnapshot =>
    this.accounts.get(accountKey)?.outbox.getSnapshot() ?? IDLE_SYNC;

  async purgeAccount(accountKey: string): Promise<void> {
    for (const [sessionKey, recording] of this.live) {
      if (recording.accountKey === accountKey) {
        this.live.delete(sessionKey);
        recording.halt({ kind: "auth", message: ACCESS_ENDED });
      }
    }
    const connected = this.accounts.get(accountKey);
    if (connected) {
      connected.outbox.stop();
      connected.stopped = true;
    }
    await this.store.purgeAccount(accountKey);
    this.draftsChanged(accountKey);
  }

  refreshDrafts(accountKey: string): void {
    this.store
      .readDrafts(accountKey)
      .then((stored) => {
        const visible = stored
          .flatMap((item) => visibleDraft(item, this.live.has(item.sessionKey)))
          .sort((a, b) => b.startedAt - a.startedAt);
        this.drafts.set(accountKey, visible);
        this.notify();
      })
      .catch(() => {
        this.drafts.set(accountKey, NO_DRAFTS);
        this.notify();
      });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  subscribeDrafts(accountKey: string, listener: () => void): () => void {
    const unsubscribe = this.subscribe(listener);
    if (!this.drafts.has(accountKey)) {
      this.drafts.set(accountKey, NO_DRAFTS);
      this.refreshDrafts(accountKey);
    }
    return unsubscribe;
  }

  private draftsChanged(accountKey: string): void {
    this.refreshDrafts(accountKey);
    this.channel?.postMessage("changed");
  }

  private ensureOutbox(options: {
    accountKey: string;
    api: SessionApi;
    maxLocalBufferBytes: number | null;
  }): ConnectedAccount {
    const { accountKey, api } = options;
    const existing = this.accounts.get(accountKey);
    const reusable =
      existing &&
      !existing.stopped &&
      existing.api === api &&
      existing.outbox.getSnapshot().blockedBy !== "auth";
    if (reusable) {
      return existing;
    }
    existing?.outbox.stop();
    const maxLocalBufferBytes =
      options.maxLocalBufferBytes ??
      existing?.maxLocalBufferBytes ??
      Number.POSITIVE_INFINITY;
    const outbox = createOutbox({
      accountKey,
      api,
      maxLocalBufferBytes,
      onDraftsChanged: () => this.draftsChanged(accountKey),
      store: this.store,
    });
    outbox.subscribe(() => this.notify());
    outbox.subscribeIssues((issue) => {
      if (issue.kind === "auth") {
        this.purgeAccount(accountKey).catch(() => undefined);
      }
    });
    const connected = { api, maxLocalBufferBytes, outbox, stopped: false };
    this.accounts.set(accountKey, connected);
    outbox.drain();
    return connected;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createLocalSessions(store: SessionLocalStore): LocalSessions {
  return new LocalSessionsRegistry(store);
}

export const localSessions = createLocalSessions(createIndexedSessionStore());

export function useSyncStatus(accountKey: string): SyncSnapshot {
  return useSyncExternalStore(
    localSessions.subscribe,
    () => localSessions.getSyncSnapshot(accountKey),
    () => IDLE_SYNC
  );
}

export function useLocalDrafts(accountKey: string): LocalDraft[] {
  return useSyncExternalStore(
    (listener) => localSessions.subscribeDrafts(accountKey, listener),
    () => localSessions.getDrafts(accountKey),
    () => NO_DRAFTS
  );
}

export function discardLocalDraft(options: {
  accountKey: string;
  api: SessionApi;
  sessionKey: string;
}): Promise<void> {
  return localSessions.discardDraft(options);
}

export function purgeAccount(accountKey: string): Promise<void> {
  return localSessions.purgeAccount(accountKey);
}
