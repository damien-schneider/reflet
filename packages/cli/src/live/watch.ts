import type { LiveEntry, LiveFeed, LiveSession } from "./live-feed";

const POLL_INTERVAL_MS = 2000;
const QUIET_BEFORE_HANDOVER_MS = 5000;

export interface WatchState {
  delivered: string[];
  ended: boolean;
  sessionId: string;
}

export interface WatchPorts {
  fetchFeed: () => Promise<LiveFeed>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export interface FollowedSession {
  session: LiveSession;
  transcription: LiveFeed["transcription"];
}

export interface WatchResult {
  ended: boolean;
  entries: LiveEntry[];
  followed: FollowedSession | null;
  screenshots: LiveFeed["screenshots"];
  state: WatchState | null;
}

/** A session first seen already ended was recorded before the agent watched: it is never handed over. */
function followNewestSession(
  state: WatchState | null,
  session: LiveSession | null
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
  feed: LiveFeed,
  state: WatchState | null,
  handover: { ended: boolean; entries: LiveEntry[] }
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
    screenshots: feed.screenshots,
    state,
  };
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
    state = followNewestSession(state, feed.session);
    const now = ports.now();
    const snapshot = JSON.stringify([
      feed.session?.collection,
      feed.transcription.running,
      feed.entries.map(({ id }) => id),
    ]);
    if (snapshot !== lastSnapshot) {
      lastSnapshot = snapshot;
      changedAt = now;
    }

    const activeState = state?.ended === false ? state : null;
    const fresh = activeState
      ? feed.entries.filter(({ id }) => !activeState.delivered.includes(id))
      : [];
    const isTranscribing = feed.transcription.running > 0;
    const ended =
      activeState !== null &&
      feed.session?.collection === "ended" &&
      !isTranscribing;
    const isSettled =
      !isTranscribing && now - changedAt >= QUIET_BEFORE_HANDOVER_MS;
    const isTimedOut = now >= deadline;
    const hasHandover =
      ended || (fresh.length > 0 && (isSettled || isTimedOut));

    if (activeState && hasHandover) {
      return resultOf(
        feed,
        {
          delivered: [...activeState.delivered, ...fresh.map(({ id }) => id)],
          ended,
          sessionId: activeState.sessionId,
        },
        { ended, entries: fresh }
      );
    }
    if (isTimedOut) {
      return resultOf(feed, state, { ended: false, entries: [] });
    }
    await ports.sleep(POLL_INTERVAL_MS);
  }
}
