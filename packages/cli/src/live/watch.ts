import type { LiveHubEntry, LiveHubFeed } from "reflet-sdk/live-hub";
import { LIVE_SESSIONS_DIRECTORY } from "./live-screenshots";

export const DEFAULT_TIMEOUT_SECONDS = 90;
export const WATCH_STATE_FILE = `${LIVE_SESSIONS_DIRECTORY}/watch.json`;
const POLL_INTERVAL_MS = 2000;
const QUIET_BEFORE_HANDOVER_MS = 5000;

type LiveHubSession = NonNullable<LiveHubFeed["session"]>;

export interface WatchState {
  delivered: string[];
  ended: boolean;
  sessionId: string;
}

export interface WatchPorts {
  fetchFeed: () => Promise<LiveHubFeed | null>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export interface FollowedSession {
  session: LiveHubSession;
  transcription: LiveHubFeed["transcription"];
}

export interface WatchResult {
  ended: boolean;
  entries: LiveHubEntry[];
  followed: FollowedSession | null;
  hubRunning: boolean;
  screenshots: LiveHubFeed["screenshots"];
  state: WatchState | null;
}

function followNewestSession(
  state: WatchState | null,
  session: LiveHubSession | null
): WatchState | null {
  if (!session || session.id === state?.sessionId) {
    return state;
  }
  return {
    delivered: [],
    ended: session.collection === "ended",
    sessionId: session.id,
  };
}

function resultOf(
  feed: LiveHubFeed,
  state: WatchState | null,
  handover: { ended: boolean; entries: LiveHubEntry[] }
): WatchResult {
  const isFollowed =
    state !== null &&
    feed.session?.id === state.sessionId &&
    (!state.ended || handover.ended);
  return {
    ...handover,
    followed:
      isFollowed && feed.session
        ? { session: feed.session, transcription: feed.transcription }
        : null,
    hubRunning: true,
    screenshots: feed.screenshots,
    state,
  };
}

function handoverOf(
  feed: LiveHubFeed,
  following: WatchState,
  isQuietEnough: boolean
): WatchResult | null {
  const fresh = feed.entries.filter(
    ({ id }) => !following.delivered.includes(id)
  );
  const ended =
    feed.session?.collection === "ended" && feed.transcription.running === 0;
  if (!(ended || (fresh.length > 0 && isQuietEnough))) {
    return null;
  }
  return resultOf(
    feed,
    {
      delivered: [...following.delivered, ...fresh.map(({ id }) => id)],
      ended,
      sessionId: following.sessionId,
    },
    { ended, entries: fresh }
  );
}

export async function watchLiveSession(
  ports: WatchPorts,
  input: { state: WatchState | null; timeoutMs: number }
): Promise<WatchResult> {
  const deadline = ports.now() + input.timeoutMs;
  let state = input.state;
  let lastSnapshot: string | null = null;
  let changedAt = ports.now();

  for (;;) {
    const feed = await ports.fetchFeed();
    const now = ports.now();
    const isTimedOut = now >= deadline;
    if (feed) {
      state = followNewestSession(state, feed.session);
      const snapshot = JSON.stringify([
        feed.session?.collection,
        feed.transcription.running,
        feed.entries.map(({ id }) => id),
      ]);
      if (snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        changedAt = now;
      }
      const isSettled =
        feed.transcription.running === 0 &&
        now - changedAt >= QUIET_BEFORE_HANDOVER_MS;
      const handover =
        state?.ended === false
          ? handoverOf(feed, state, isSettled || isTimedOut)
          : null;
      if (handover) {
        return handover;
      }
    }
    if (isTimedOut && feed) {
      return resultOf(feed, state, { ended: false, entries: [] });
    }
    if (isTimedOut) {
      return {
        ended: false,
        entries: [],
        followed: null,
        hubRunning: false,
        screenshots: [],
        state,
      };
    }
    await ports.sleep(POLL_INTERVAL_MS);
  }
}
