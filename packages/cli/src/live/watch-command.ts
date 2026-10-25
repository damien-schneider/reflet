import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { fetchHubFeed } from "reflet-sdk/live-hub";
import { type FileSystemPort, nodeFileSystem } from "../project";
import { style } from "../render";
import { saveCitedScreenshots } from "./live-screenshots";
import {
  DEFAULT_TIMEOUT_SECONDS,
  WATCH_STATE_FILE,
  type WatchState,
  watchLiveSession,
} from "./watch";
import { jsonReport, textReport } from "./watch-report";

const MAX_TIMEOUT_SECONDS = 3600;
const MS_PER_SECOND = 1000;

const USAGE = `${style.bold("reflet live watch")} [--timeout <seconds>] [--json]

  Waits for what you say while Reflet Live records, then prints each passage
  with the app it is about, what you clicked or pointed at, source locations
  and screenshots.

  --timeout <seconds>  return with nothing new after this long (default ${DEFAULT_TIMEOUT_SECONDS})
  --json               print JSON (default when piped)
`;

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

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function readWatchState(files: FileSystemPort): WatchState | null {
  const text = files.read(WATCH_STATE_FILE);
  let parsed: unknown = null;
  try {
    parsed = text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const delivered: unknown = Reflect.get(parsed, "delivered");
  const ended: unknown = Reflect.get(parsed, "ended");
  const sessionId: unknown = Reflect.get(parsed, "sessionId");
  return isStringArray(delivered) &&
    typeof ended === "boolean" &&
    typeof sessionId === "string"
    ? { delivered, ended, sessionId }
    : null;
}

export async function runLiveWatch(argv: string[]): Promise<number> {
  if (argv.includes("--help")) {
    process.stdout.write(USAGE);
    return 0;
  }
  const { values } = parseArgs({
    args: argv,
    options: {
      json: { type: "boolean" },
      timeout: { type: "string" },
    },
  });
  const timeoutMs = timeoutSeconds(values.timeout) * MS_PER_SECOND;

  const result = await watchLiveSession(
    { fetchFeed: fetchHubFeed, now: Date.now, sleep },
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
