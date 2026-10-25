import { randomUUID } from "node:crypto";
import { basename, relative, sep } from "node:path";
import {
  type ListedConnection,
  listConnections,
} from "../../devtools/server/connect/connection-store";
import {
  type DevtoolsOutcome,
  failure,
} from "../../devtools/server/json-response";
import type {
  LiveApp,
  LiveAppIdentity,
  LiveCommand,
  LiveHubFeed,
  LivePresence,
  LiveStatus,
  LiveWindowMessage,
  LiveWindowState,
} from "../protocol";
import { type FeedPoller, pollLiveFeed } from "./feed/feed-cache";
import { PresenceTimeline } from "./feed/presence-timeline";

export type LiveHubEvent =
  | { kind: "app-joined"; app: LiveApp }
  | { kind: "recording"; organizationName: string }
  | { kind: "paused" }
  | { kind: "stopped" }
  | { kind: "window-closed" };

type WindowPhase = LiveWindowState["phase"];
type SendToWindow = (message: LiveWindowMessage) => void;

const COMMAND_TIMEOUT_MS = 3000;
const AGENT_FOLLOWING_MS = 180_000;
const RECENT_FEED_ENTRIES = 5;
const ACTIVE_PHASES: WindowPhase[] = ["recording", "paused"];
const COMMAND_TARGETS: Record<LiveCommand, WindowPhase[]> = {
  pause: ["paused"],
  resume: ["recording"],
  start: ["recording"],
  stop: ["idle", "finishing"],
};
const WINDOW_CLOSED =
  "The Reflet Live window is closed. Run npx reflet-cli live to reopen it.";
const PRESS_RECORD_FIRST = "Press Record in the Reflet Live window once first.";
const SWITCH_WHILE_RECORDING =
  "Stop the recording before switching organization.";

const EMPTY_FEED: LiveHubFeed = {
  entries: [],
  screenshots: [],
  session: null,
  transcription: { running: 0 },
};

function holdsSession(state: LiveWindowState | null): state is LiveWindowState {
  return (
    state !== null &&
    (ACTIVE_PHASES.includes(state.phase) ||
      (state.phase === "requesting" && state.sessionId !== null))
  );
}

function isSettled(state: LiveWindowState): boolean {
  return (
    state.phase !== "finishing" &&
    state.pendingUploads === 0 &&
    !holdsSession(state)
  );
}

function liveAppOf(identity: LiveAppIdentity): LiveApp {
  const inside = relative(identity.workspaceRoot, identity.root)
    .split(sep)
    .join("/");
  const workspace = basename(identity.workspaceRoot);
  return {
    id: `${identity.origin}|${identity.root}`,
    label: inside ? `${workspace}/${inside}` : workspace,
    origin: identity.origin,
    repoRoot: identity.workspaceRoot,
    root: identity.root,
  };
}

export class LiveHubState {
  readonly #onEvent: (event: LiveHubEvent) => void;
  readonly #apps = new Map<string, LiveApp>();
  readonly #presence = new PresenceTimeline();
  readonly #waiters = new Set<(closing: boolean) => void>();
  #window: SendToWindow | null = null;
  #windowState: LiveWindowState | null = null;
  #selectedId: string | null = null;
  #organizationName: string | null = null;
  #poller: FeedPoller | null = null;
  #lastFeed: LiveHubFeed = EMPTY_FEED;
  #followingUntil = 0;
  #followingTimer: ReturnType<typeof setTimeout> | undefined;
  #sentApps = "";
  #sentFeed = "";

  constructor(onEvent: (event: LiveHubEvent) => void) {
    this.#onEvent = onEvent;
  }

  get hasWindow(): boolean {
    return this.#window !== null;
  }

  get selectedId(): string | null {
    return this.#selectedId;
  }

  async connection(): Promise<ListedConnection | null> {
    const selectedId = this.#selectedId;
    return selectedId ? await this.#resolveConnection(selectedId) : null;
  }

  async #resolveConnection(id: string): Promise<ListedConnection | null> {
    const connection =
      (await listConnections()).find((listed) => listed.id === id) ?? null;
    if (connection && id === this.#selectedId) {
      this.#organizationName = connection.organizationName;
    }
    return connection;
  }

  status(): LiveStatus {
    const window = this.#windowState;
    const session =
      holdsSession(window) &&
      window.sessionId &&
      window.startedAt &&
      window.limits
        ? {
            id: window.sessionId,
            limits: window.limits,
            startedAt: window.startedAt,
          }
        : null;
    return {
      canStart: this.#window !== null && (window?.canStart ?? false),
      organizationName: this.#organizationName,
      session,
      state: this.#liveState(),
    };
  }

  attachWindow(send: SendToWindow): boolean {
    if (this.#window) {
      return false;
    }
    this.#window = send;
    this.#sentApps = "";
    this.#sentFeed = "";
    this.#sendApps();
    send({ following: this.#isFollowed(), kind: "agent" });
    this.#sendFeed(this.#currentFeed());
    return true;
  }

  detachWindow(send: SendToWindow): void {
    if (this.#window !== send) {
      return;
    }
    this.#window = null;
    this.#poller?.stop();
    this.#windowState = null;
    this.#onEvent({ kind: "window-closed" });
    this.#settleWaiters();
  }

  heartbeat(): void {
    this.#window?.({ kind: "ping" });
    this.#sendApps();
  }

  updateWindow(next: LiveWindowState): LiveStatus {
    const previous = this.#windowState?.phase ?? "idle";
    const wasActive = holdsSession(this.#windowState);
    const isActive = holdsSession(next);
    this.#windowState = next;
    const organizationName = this.#organizationName;
    if (isActive && next.sessionId && next.startedAt) {
      this.#follow(next.sessionId, next.startedAt);
    }
    if (
      next.phase === "recording" &&
      previous !== "recording" &&
      organizationName
    ) {
      this.#onEvent({ kind: "recording", organizationName });
    }
    if (next.phase === "paused" && previous !== "paused") {
      this.#onEvent({ kind: "paused" });
    }
    if (wasActive && !isActive) {
      this.#onEvent({ kind: "stopped" });
    }
    if (isSettled(next)) {
      this.#poller?.stop();
    }
    this.#settleWaiters();
    return this.status();
  }

  selectConnection(connection: ListedConnection): string | null {
    const isSwitching =
      this.#selectedId !== null && this.#selectedId !== connection.id;
    const window = this.#windowState;
    const isActive = holdsSession(window);
    if (isSwitching && isActive) {
      return SWITCH_WHILE_RECORDING;
    }
    const isAdopting = this.#selectedId === null && isActive;
    this.#selectedId = connection.id;
    this.#organizationName = connection.organizationName;
    if (isActive && window.sessionId && window.startedAt) {
      this.#follow(window.sessionId, window.startedAt);
    }
    if (isAdopting) {
      this.#onEvent({
        kind: "recording",
        organizationName: connection.organizationName,
      });
      if (window.phase === "paused") {
        this.#onEvent({ kind: "paused" });
      }
    }
    return null;
  }

  reportPresence(
    identity: LiveAppIdentity,
    presence: LivePresence
  ): LiveStatus {
    const app = liveAppOf(identity);
    if (!this.#apps.has(app.id)) {
      this.#apps.set(app.id, app);
      this.#onEvent({ app, kind: "app-joined" });
    }
    this.#presence.report(app, presence);
    this.#sendApps();
    return this.status();
  }

  async command(action: LiveCommand): Promise<DevtoolsOutcome<LiveStatus>> {
    const send = this.#window;
    if (!send) {
      return failure(WINDOW_CLOSED, 409);
    }
    if (action === "start" && !this.status().canStart) {
      return failure(PRESS_RECORD_FIRST, 409);
    }
    const reached = () => {
      const phase = this.#windowState?.phase;
      return phase !== undefined && COMMAND_TARGETS[action].includes(phase);
    };
    if (!reached()) {
      send({ action, id: randomUUID(), kind: "command" });
      await this.#waitFor(reached, COMMAND_TIMEOUT_MS);
    }
    return { ok: true, value: this.status() };
  }

  isCurrentSession(sessionId: string): boolean {
    const window = this.#windowState;
    return holdsSession(window) && window.sessionId === sessionId;
  }

  readFeed(): LiveHubFeed {
    const wasFollowed = this.#isFollowed();
    this.#followingUntil = Date.now() + AGENT_FOLLOWING_MS;
    clearTimeout(this.#followingTimer);
    this.#followingTimer = setTimeout(() => {
      this.#window?.({ following: false, kind: "agent" });
    }, AGENT_FOLLOWING_MS);
    if (!wasFollowed) {
      this.#window?.({ following: true, kind: "agent" });
    }
    return this.#currentFeed();
  }

  async stopRecording(timeoutMs: number): Promise<boolean> {
    if (this.#window && holdsSession(this.#windowState)) {
      this.#window({ action: "stop", id: randomUUID(), kind: "command" });
    }
    return await this.#waitFor(() => {
      const window = this.#windowState;
      return this.#window === null || (window !== null && isSettled(window));
    }, timeoutMs);
  }

  #waitFor(isDone: () => boolean, timeoutMs: number): Promise<boolean> {
    if (isDone()) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const finish = (done: boolean) => {
        clearTimeout(timer);
        this.#waiters.delete(check);
        resolve(done);
      };
      const check = (closing: boolean) => {
        if (closing || isDone()) {
          finish(!closing);
        }
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      this.#waiters.add(check);
    });
  }

  close(): void {
    clearTimeout(this.#followingTimer);
    this.#poller?.close();
    this.#window = null;
    for (const check of [...this.#waiters]) {
      check(true);
    }
  }

  #liveState(): LiveStatus["state"] {
    if (!this.#window) {
      return "no-window";
    }
    const window = this.#windowState;
    switch (window?.phase) {
      case "recording":
        return "recording";
      case "paused":
        return "paused";
      case "requesting":
        return window.sessionId ? "paused" : "idle";
      case "finishing":
        return "finishing";
      default:
        return "idle";
    }
  }

  #isFollowed(): boolean {
    return Date.now() < this.#followingUntil;
  }

  #currentFeed(): LiveHubFeed {
    return this.#poller?.feed() ?? this.#lastFeed;
  }

  #follow(sessionId: string, startedAt: number): void {
    const selectedId = this.#selectedId;
    const organizationName = this.#organizationName;
    const poller = this.#poller;
    if (
      !(selectedId && organizationName) ||
      (poller?.sessionId === sessionId && !poller.isStopped())
    ) {
      return;
    }
    if (poller) {
      this.#lastFeed = poller.feed();
      poller.close();
    }
    this.#presence.forgetBefore(startedAt);
    this.#poller = pollLiveFeed({
      connection: () => this.#resolveConnection(selectedId),
      onChange: (feed) => this.#sendFeed(feed),
      session: { id: sessionId, organizationName, startedAt },
      transitions: () => this.#presence.since(startedAt, Date.now()),
    });
  }

  #sendApps(): void {
    const message: LiveWindowMessage = {
      apps: [...this.#apps.values()],
      focusedAppId: this.#presence.focusedApp(Date.now())?.id ?? null,
      kind: "apps",
    };
    const serialized = JSON.stringify(message);
    if (this.#window && serialized !== this.#sentApps) {
      this.#sentApps = serialized;
      this.#window(message);
    }
  }

  #sendFeed(feed: LiveHubFeed): void {
    const message: LiveWindowMessage = {
      entries: feed.entries.slice(-RECENT_FEED_ENTRIES),
      kind: "feed",
    };
    const serialized = JSON.stringify(message);
    if (this.#window && serialized !== this.#sentFeed) {
      this.#sentFeed = serialized;
      this.#window(message);
    }
  }

  #settleWaiters(): void {
    for (const check of [...this.#waiters]) {
      check(false);
    }
  }
}
