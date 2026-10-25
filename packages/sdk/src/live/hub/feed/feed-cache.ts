import { z } from "zod";
import { refletApiHeaders } from "../../../devtools/server/reflet-proxy";
import type { LiveHubEntry, LiveHubFeed } from "../../protocol";
import { type FocusTransition, placeOf } from "./attribution";

const POLL_INTERVAL_MS = 2000;
const SETTLED_AFTER_MS = 60_000;
const FEED_REQUEST_TIMEOUT_MS = 10_000;
const LIVE_FEED_PATH = "/api/v1/sessions/live";

const backendLiveFeedSchema = z.object({
  entries: z.array(
    z.object({
      atMs: z.number(),
      endMs: z.number(),
      id: z.string(),
      lines: z.array(z.string()),
      screenshotIds: z.array(z.string()),
    })
  ),
  screenshots: z.array(z.object({ id: z.string(), url: z.string() })),
  session: z.object({
    collection: z.enum(["recording", "paused", "ended"]),
    id: z.string(),
    startedAt: z.number(),
  }),
  transcription: z.object({
    oldestRunningMs: z.number().nullable(),
    running: z.number(),
  }),
});
export type BackendLiveFeed = z.infer<typeof backendLiveFeedSchema>;

export interface FeedSnapshot {
  cursorMs: number;
  feed: LiveHubFeed;
}

export interface FeedSession {
  id: string;
  organizationName: string;
  startedAt: number;
}

export function initialFeed(session: FeedSession): FeedSnapshot {
  return {
    cursorMs: 0,
    feed: {
      entries: [],
      screenshots: [],
      session: { ...session, collection: "recording" },
      transcription: { running: 0 },
    },
  };
}

export function mergeFeed(
  previous: FeedSnapshot,
  response: BackendLiveFeed,
  context: {
    nowMs: number;
    organizationName: string;
    transitions: readonly FocusTransition[];
  }
): FeedSnapshot {
  const { cursorMs } = previous;
  const fresh = response.entries
    .filter((entry) => entry.atMs >= cursorMs)
    .sort((left, right) => left.atMs - right.atMs)
    .map(
      (entry): LiveHubEntry => ({
        ...entry,
        place: placeOf(entry, context.transitions),
      })
    );
  const entries = [
    ...previous.feed.entries.filter((entry) => entry.atMs < cursorMs),
    ...fresh,
  ];
  const urls = new Map(
    [...previous.feed.screenshots, ...response.screenshots].map(
      (screenshot) => [screenshot.id, screenshot.url]
    )
  );
  const screenshots = entries.flatMap((entry) =>
    entry.screenshotIds.flatMap((id) => {
      const url = urls.get(id);
      return url ? [{ id, url }] : [];
    })
  );
  const settledUntil = Math.min(
    response.transcription.oldestRunningMs ?? Number.POSITIVE_INFINITY,
    context.nowMs - SETTLED_AFTER_MS
  );
  return {
    cursorMs: Math.max(cursorMs, settledUntil),
    feed: {
      entries,
      screenshots,
      session: {
        collection: response.session.collection,
        id: response.session.id,
        organizationName: context.organizationName,
        startedAt: response.session.startedAt,
      },
      transcription: { running: response.transcription.running },
    },
  };
}

async function fetchBackendFeed(
  connection: { apiUrl: string; token: string },
  sessionId: string,
  sinceMs: number
): Promise<BackendLiveFeed | null> {
  const query = new URLSearchParams({ sessionId, sinceMs: String(sinceMs) });
  try {
    const response = await fetch(
      `${connection.apiUrl}${LIVE_FEED_PATH}?${query}`,
      {
        headers: refletApiHeaders(connection.token),
        signal: AbortSignal.timeout(FEED_REQUEST_TIMEOUT_MS),
      }
    );
    if (!response.ok) {
      return null;
    }
    const parsed = backendLiveFeedSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export interface FeedPoller {
  close: () => void;
  feed: () => LiveHubFeed;
  isStopped: () => boolean;
  readonly sessionId: string;
  stop: () => void;
}

export function pollLiveFeed(options: {
  connection: () => Promise<{ apiUrl: string; token: string } | null>;
  onChange: (feed: LiveHubFeed) => void;
  session: FeedSession;
  transitions: () => readonly FocusTransition[];
}): FeedPoller {
  const { session } = options;
  let snapshot = initialFeed(session);
  let stopped = false;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    const stoppedBeforeFetch = stopped;
    const connection = await options.connection();
    const response = connection
      ? await fetchBackendFeed(connection, session.id, snapshot.cursorMs)
      : null;
    if (closed) {
      return;
    }
    if (response) {
      snapshot = mergeFeed(snapshot, response, {
        nowMs: Date.now() - session.startedAt,
        organizationName: session.organizationName,
        transitions: options.transitions(),
      });
      options.onChange(snapshot.feed);
    }
    const isTranscribed = response?.transcription.running === 0;
    const drained =
      isTranscribed &&
      (stoppedBeforeFetch || response?.session.collection === "ended");
    if (!drained) {
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    }
  };
  timer = setTimeout(tick, 0);

  return {
    close: () => {
      closed = true;
      clearTimeout(timer);
    },
    feed: () => snapshot.feed,
    isStopped: () => stopped,
    sessionId: session.id,
    stop: () => {
      stopped = true;
    },
  };
}
