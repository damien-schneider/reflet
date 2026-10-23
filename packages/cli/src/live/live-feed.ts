const LIVE_FEED_ROUTE = "/api/reflet-devtools/proxy/api/v1/sessions/live";
const FEED_REQUEST_TIMEOUT_MS = 20_000;
const NOT_FOUND_STATUS = 404;
const COLLECTIONS = ["recording", "paused", "ended"] as const;

export interface LiveEntry {
  id: string;
  lines: string[];
  screenshotIds: string[];
}

export interface LiveSession {
  collection: (typeof COLLECTIONS)[number];
  id: string;
  title: string;
}

export interface LiveFeed {
  entries: LiveEntry[];
  screenshots: { id: string; url: string }[];
  session: LiveSession | null;
  transcription: { failed: number; running: number };
}

export const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function parseEntry(value: unknown): LiveEntry {
  const id = fieldOf(value, "id");
  const lines = fieldOf(value, "lines");
  const screenshotIds = fieldOf(value, "screenshotIds");
  if (
    typeof id === "string" &&
    isStringArray(lines) &&
    isStringArray(screenshotIds)
  ) {
    return { id, lines, screenshotIds };
  }
  throw new Error("Reflet sent a live session entry this CLI cannot read.");
}

function parseScreenshot(value: unknown): { id: string; url: string } {
  const id = fieldOf(value, "id");
  const url = fieldOf(value, "url");
  if (typeof id === "string" && typeof url === "string") {
    return { id, url };
  }
  throw new Error("Reflet sent a screenshot this CLI cannot read.");
}

function parseSession(value: unknown): LiveSession | null {
  if (value === null) {
    return null;
  }
  const collection = COLLECTIONS.find(
    (known) => known === fieldOf(value, "collection")
  );
  const id = fieldOf(value, "id");
  const title = fieldOf(value, "title");
  if (collection && typeof id === "string" && typeof title === "string") {
    return { collection, id, title };
  }
  throw new Error("Reflet sent a live session this CLI cannot read.");
}

function parseLiveFeed(body: unknown): LiveFeed {
  const entries = fieldOf(body, "entries");
  const screenshots = fieldOf(body, "screenshots");
  const transcription = fieldOf(body, "transcription");
  const failed = fieldOf(transcription, "failed");
  const running = fieldOf(transcription, "running");
  if (
    !(
      Array.isArray(entries) &&
      Array.isArray(screenshots) &&
      typeof failed === "number" &&
      typeof running === "number"
    )
  ) {
    throw new Error(
      "The dev server did not answer with a live session feed. Update reflet-cli and reflet-sdk."
    );
  }
  return {
    entries: entries.map(parseEntry),
    screenshots: screenshots.map(parseScreenshot),
    session: parseSession(fieldOf(body, "session")),
    transcription: { failed, running },
  };
}

function failureMessage(origin: string, status: number, body: unknown): string {
  const error = fieldOf(body, "error");
  const reported = typeof error === "string" ? error : null;
  if (status === NOT_FOUND_STATUS) {
    return reported
      ? `${reported} Update reflet-sdk in this app: its devtools route predates live sessions.`
      : `No Reflet devtools route at ${origin}. Mount it as the reflet-sdk README shows, or pass the dev server with --url.`;
  }
  return reported ?? `The dev server answered with status ${status}.`;
}

/** Sessions only answer their author's sign-in, which the dev server holds, never a secret key. */
export async function fetchLiveFeed(
  origin: string,
  fetchFeed: typeof fetch = fetch
): Promise<LiveFeed> {
  let response: Response;
  try {
    response = await fetchFeed(`${origin}${LIVE_FEED_ROUTE}`, {
      headers: { "sec-fetch-site": "none", "x-reflet-devtools": "1" },
      signal: AbortSignal.timeout(FEED_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    throw new Error(
      isTimeout
        ? `The dev server at ${origin} did not answer within ${FEED_REQUEST_TIMEOUT_MS / 1000} seconds.`
        : `Nothing answers at ${origin}. Start the app's dev server, or pass it with --url.`
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(failureMessage(origin, response.status, body));
  }
  return parseLiveFeed(body);
}
