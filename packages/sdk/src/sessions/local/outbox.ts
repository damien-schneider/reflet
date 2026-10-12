import { describeStorageFailure } from "../../storage/indexed-db";
import type { SessionApi } from "../api/session-api";
import type { SessionLimitKind } from "../protocol";
import {
  classifyFailure,
  type OperationOutcome,
  operationBytes,
  sendOperation,
} from "./outbox-operations";
import type {
  OutboxPayload,
  SessionLocalStore,
  StoredDraft,
  StoredOperation,
  SyncSnapshot,
} from "./session-store";

const FIRST_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60_000;
const BUFFER_FULL = "This device's upload buffer is full.";

export type OutboxIssue =
  | { kind: "auth" }
  | { kind: "limit"; limit: SessionLimitKind; sessionKey: string }
  | { kind: "sessionGone"; sessionKey: string };

export interface Outbox {
  drain: () => void;
  enqueue: (sessionKey: string, payload: OutboxPayload) => Promise<void>;
  getSnapshot: () => SyncSnapshot;
  stop: () => void;
  subscribe: (listener: () => void) => () => void;
  subscribeIssues: (listener: (issue: OutboxIssue) => void) => () => void;
}

export interface OutboxOptions {
  accountKey: string;
  api: SessionApi;
  maxLocalBufferBytes: number;
  onDraftsChanged: () => void;
  store: SessionLocalStore;
}

export class OutboxStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutboxStorageError";
  }
}

interface DrainPass {
  outcomes: Map<string, OperationOutcome>;
  sessionIds: Map<string, string>;
}

function sessionIdsOf(drafts: StoredDraft[]): Map<string, string> {
  const ids = new Map<string, string>();
  for (const draft of drafts) {
    if (draft.sessionId !== null) {
      ids.set(draft.sessionKey, draft.sessionId);
    }
  }
  return ids;
}

class SessionOutbox implements Outbox {
  private readonly controller = new AbortController();
  private draining = false;
  private drainAgain = false;
  private failedPasses = 0;
  private readonly issueListeners = new Set<(issue: OutboxIssue) => void>();
  private readonly listeners = new Set<() => void>();
  private readonly options: OutboxOptions;
  private retryTimer: number | undefined;
  private snapshot: SyncSnapshot = {
    blockedBy: null,
    isOnline: navigator.onLine,
    lastError: null,
    pendingBytes: 0,
    pendingOperations: 0,
  };

  constructor(options: OutboxOptions) {
    this.options = options;
    const listen = { signal: this.controller.signal };
    window.addEventListener("online", this.reconnected, listen);
    window.addEventListener("offline", this.disconnected, listen);
    window.addEventListener("focus", this.drain, listen);
  }

  readonly drain = (): void => {
    if (this.isHalted()) {
      return;
    }
    if (this.draining) {
      this.drainAgain = true;
      return;
    }
    this.draining = true;
    this.drainPass()
      .catch((error: unknown) =>
        this.publish({
          blockedBy: "storage",
          lastError: describeStorageFailure(error),
        })
      )
      .finally(() => {
        this.draining = false;
        if (this.drainAgain) {
          this.drainAgain = false;
          this.drain();
        }
      });
  };

  async enqueue(sessionKey: string, payload: OutboxPayload): Promise<void> {
    const bytes = operationBytes(payload);
    if (this.snapshot.pendingBytes + bytes > this.options.maxLocalBufferBytes) {
      this.failStorage(BUFFER_FULL);
    }
    try {
      await this.options.store.addOperation({
        accountKey: this.options.accountKey,
        bytes,
        payload,
        sessionKey,
      });
    } catch (error) {
      this.failStorage(describeStorageFailure(error));
    }
    this.publish({
      blockedBy: this.snapshot.blockedBy === "auth" ? "auth" : null,
      pendingBytes: this.snapshot.pendingBytes + bytes,
      pendingOperations: this.snapshot.pendingOperations + 1,
    });
    this.drain();
  }

  getSnapshot = (): SyncSnapshot => this.snapshot;

  stop(): void {
    this.controller.abort();
    window.clearTimeout(this.retryTimer);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  subscribeIssues(listener: (issue: OutboxIssue) => void): () => void {
    this.issueListeners.add(listener);
    return () => this.issueListeners.delete(listener);
  }

  private readonly disconnected = () => this.publish({ isOnline: false });

  private readonly reconnected = () => {
    this.publish({ isOnline: true });
    this.drain();
  };

  private isHalted(): boolean {
    return this.snapshot.blockedBy === "auth" || this.controller.signal.aborted;
  }

  private failStorage(message: string): never {
    this.publish({ blockedBy: "storage", lastError: message });
    throw new OutboxStorageError(message);
  }

  private publish(next: Partial<SyncSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) {
      listener();
    }
  }

  private report(issue: OutboxIssue): void {
    for (const listener of this.issueListeners) {
      listener(issue);
    }
  }

  private async drainPass(): Promise<void> {
    const { accountKey, store } = this.options;
    const pass: DrainPass = {
      outcomes: new Map(),
      sessionIds: sessionIdsOf(await store.readDrafts(accountKey)),
    };
    for (const operation of await store.readOperations(accountKey)) {
      if (this.isHalted()) {
        return;
      }
      if (pass.outcomes.get(operation.sessionKey)?.kind !== "retry") {
        await this.runOperation(operation, pass);
      }
    }
    const remaining = await store.readOperations(accountKey);
    this.publish({
      pendingBytes: remaining.reduce((sum, item) => sum + item.bytes, 0),
      pendingOperations: remaining.length,
    });
    await this.forgetFinishedDrafts(remaining);
    this.afterPass(pass);
  }

  private afterPass(pass: DrainPass): void {
    const stalled = [...pass.outcomes.values()].some(
      (outcome) => outcome.kind === "retry"
    );
    if (!stalled) {
      this.failedPasses = 0;
      this.publish({ lastError: null });
      return;
    }
    this.failedPasses += 1;
    const delay = Math.min(
      MAX_RETRY_DELAY_MS,
      FIRST_RETRY_DELAY_MS * 2 ** (this.failedPasses - 1)
    );
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(this.drain, delay);
  }

  private async runOperation(
    operation: StoredOperation,
    pass: DrainPass
  ): Promise<void> {
    const outcome = await sendOperation({
      api: this.options.api,
      operation,
      sessionId: pass.sessionIds.get(operation.sessionKey) ?? null,
      store: this.options.store,
    }).catch(classifyFailure);
    pass.outcomes.set(operation.sessionKey, outcome);
    const settled = await this.settle(operation, outcome, pass);
    if (settled) {
      await this.options.store.deleteOperations([operation.id]);
    }
  }

  private async settle(
    operation: StoredOperation,
    outcome: OperationOutcome,
    pass: DrainPass
  ): Promise<boolean> {
    const { sessionKey } = operation;
    switch (outcome.kind) {
      case "retry":
        this.publish({ lastError: outcome.message });
        return false;
      case "auth":
        this.publish({ blockedBy: "auth", lastError: null });
        this.report({ kind: "auth" });
        return false;
      case "sessionGone":
        await this.dropSession(sessionKey);
        this.report({ kind: "sessionGone", sessionKey });
        return false;
      case "started":
        pass.sessionIds.set(sessionKey, outcome.sessionId);
        await this.options.store.patchDraft(sessionKey, {
          sessionId: outcome.sessionId,
        });
        this.options.onDraftsChanged();
        return true;
      case "limit":
        this.report({ kind: "limit", limit: outcome.limit, sessionKey });
        return true;
      case "drop":
        this.publish({ lastError: outcome.message });
        return true;
      default:
        return true;
    }
  }

  private async dropSession(sessionKey: string): Promise<void> {
    const { accountKey, store } = this.options;
    const operations = await store.readOperations(accountKey);
    await store.deleteOperations(
      operations
        .filter((operation) => operation.sessionKey === sessionKey)
        .map((operation) => operation.id)
    );
    await store.deleteDraft(sessionKey);
    this.options.onDraftsChanged();
  }

  private async forgetFinishedDrafts(
    operations: StoredOperation[]
  ): Promise<void> {
    const { accountKey, store } = this.options;
    const waiting = new Set(
      operations.map((operation) => operation.sessionKey)
    );
    const finished = (await store.readDrafts(accountKey)).filter(
      (draft) => draft.state === "ended" && !waiting.has(draft.sessionKey)
    );
    await Promise.all(
      finished.map((draft) => store.deleteDraft(draft.sessionKey))
    );
    if (finished.length > 0) {
      this.options.onDraftsChanged();
    }
  }
}

export function createOutbox(options: OutboxOptions): Outbox {
  return new SessionOutbox(options);
}
