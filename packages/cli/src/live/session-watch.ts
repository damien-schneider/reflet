import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { type FileSystemPort, nodeFileSystem } from "../project";
import { SYMBOL, style, terminalSafe } from "../render";
import {
  fetchLiveFeed,
  fieldOf,
  isStringArray,
  type LiveEntry,
} from "./live-feed";
import {
  LIVE_SESSIONS_DIRECTORY,
  saveCitedScreenshots,
} from "./live-screenshots";
import {
  type FollowedSession,
  type WatchResult,
  type WatchState,
  watchLiveSession,
} from "./watch";

export const DEFAULT_DEV_SERVER = "http://localhost:3000";
export const DEFAULT_TIMEOUT_SECONDS = 90;
const MAX_TIMEOUT_SECONDS = 3600;
const MS_PER_SECOND = 1000;
export const WATCH_STATE_FILE = `${LIVE_SESSIONS_DIRECTORY}/watch.json`;

const USAGE = `${style.bold("reflet session watch")} [--url <dev server>] [--timeout <seconds>] [--json]

  Waits for what you say in the devtools session you are recording, then
  prints it with the elements, source locations and screenshots around it.

  --url <origin>       the app's dev server (default ${DEFAULT_DEV_SERVER})
  --timeout <seconds>  return with nothing new after this long (default ${DEFAULT_TIMEOUT_SECONDS})
  --json               print JSON (default when piped)
`;

function devServerOrigin(value: string): string {
  let url: URL | null;
  try {
    url = new URL(value);
  } catch {
    url = null;
  }
  if (url?.protocol === "http:" || url?.protocol === "https:") {
    return url.origin;
  }
  throw new Error(
    `--url needs the dev server's address, like ${DEFAULT_DEV_SERVER}`
  );
}

function timeoutSeconds(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_TIMEOUT_SECONDS;
  }
  const seconds = Number(value);
  if (
    !Number.isInteger(seconds) ||
    seconds < 1 ||
    seconds > MAX_TIMEOUT_SECONDS
  ) {
    throw new Error(
      `--timeout takes whole seconds from 1 to ${MAX_TIMEOUT_SECONDS}`
    );
  }
  return seconds;
}

function readWatchState(files: FileSystemPort): WatchState | null {
  const text = files.read(WATCH_STATE_FILE);
  let parsed: unknown = null;
  try {
    parsed = text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
  const delivered = fieldOf(parsed, "delivered");
  const ended = fieldOf(parsed, "ended");
  const sessionId = fieldOf(parsed, "sessionId");
  return isStringArray(delivered) &&
    typeof ended === "boolean" &&
    typeof sessionId === "string"
    ? { delivered, ended, sessionId }
    : null;
}

function screenshotsOf(entry: LiveEntry, saved: Map<string, string>) {
  return [...new Set(entry.screenshotIds)].map((id) => ({
    id,
    path: saved.get(id) ?? null,
  }));
}

function jsonReport(result: WatchResult, saved: Map<string, string>): string {
  return JSON.stringify(
    {
      ended: result.ended,
      entries: result.entries.map((entry) => ({
        id: entry.id,
        lines: entry.lines,
        screenshots: screenshotsOf(entry, saved),
      })),
      session: result.followed?.session ?? null,
      transcription: result.followed?.transcription ?? null,
    },
    null,
    2
  );
}

function followedReport(
  result: WatchResult,
  followed: FollowedSession,
  saved: Map<string, string>
): string[] {
  const { session, transcription } = followed;
  const collection = result.ended ? "ended" : session.collection;
  const news =
    result.entries.length === 0
      ? "nothing new"
      : `${result.entries.length} new`;
  const entryLines = result.entries.flatMap((entry) => [
    ...entry.lines.map(terminalSafe),
    ...screenshotsOf(entry, saved).map(
      ({ id, path }) =>
        `  screenshot ${terminalSafe(id)}: ${path ? terminalSafe(path) : style.yellow("could not be downloaded")}`
    ),
  ]);
  const { failed } = transcription;
  const warning =
    failed > 0
      ? [
          `${SYMBOL.warn} ${failed} passage${failed === 1 ? "" : "s"} could not be transcribed: retry from the session in the devtools, or say it again.`,
        ]
      : [];
  return [
    `${style.bold(`Session "${terminalSafe(session.title)}"`)} ${SYMBOL.bullet} ${collection} ${SYMBOL.bullet} ${news}`,
    ...entryLines,
    ...warning,
  ];
}

function textReport(result: WatchResult, saved: Map<string, string>): string {
  const report = result.followed
    ? followedReport(result, result.followed, saved)
    : [
        "No devtools session is recording. Start one from the Sessions tab of the devtools.",
      ];
  const next = result.ended
    ? "The session is over. Run reflet session watch again to follow the next one."
    : "Run reflet session watch again for what comes next.";
  return [...report, style.dim(next)].join("\n");
}

export async function runSessionWatch(argv: string[]): Promise<number> {
  const [action, ...rest] = argv;
  if (action !== "watch" || rest.includes("--help")) {
    process.stdout.write(USAGE);
    return action === "watch" ? 0 : 1;
  }
  const { values } = parseArgs({
    args: rest,
    options: {
      json: { type: "boolean" },
      timeout: { type: "string" },
      url: { type: "string" },
    },
  });
  const origin = devServerOrigin(values.url ?? DEFAULT_DEV_SERVER);
  const timeoutMs = timeoutSeconds(values.timeout) * MS_PER_SECOND;

  const result = await watchLiveSession(
    {
      fetchFeed: () => fetchLiveFeed(origin),
      now: Date.now,
      sleep,
    },
    { state: readWatchState(nodeFileSystem), timeoutMs }
  );
  const saved = result.followed
    ? await saveCitedScreenshots({
        entries: result.entries,
        screenshots: result.screenshots,
        sessionId: result.followed.session.id,
      })
    : new Map<string, string>();
  if (result.state) {
    nodeFileSystem.write(WATCH_STATE_FILE, `${JSON.stringify(result.state)}\n`);
  }

  const asJson = values.json === true || process.stdout.isTTY !== true;
  process.stdout.write(
    `${asJson ? jsonReport(result, saved) : textReport(result, saved)}\n`
  );
  return 0;
}
