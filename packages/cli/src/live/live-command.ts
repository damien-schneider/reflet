import { once } from "node:events";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  fetchHubHealth,
  LIVE_HUB_DEFAULT_PORT,
  type LiveHub,
  type LiveHubEvent,
  type LiveHubFile,
  liveWindowUrl,
  openLiveWindow,
  readLiveHubFile,
  removeLiveHubFile,
  startLiveHub,
  writeLiveHubFile,
} from "reflet-sdk/live-hub";
import { nodeFileSystem } from "../project";
import { SYMBOL, style, terminalSafe } from "../render";
import { LIVE_SKILL_NAME } from "./live-prompt";
import { runLiveWatch } from "./watch-command";

const STOP_TIMEOUT_MS = 15_000;
const MAX_PORT = 65_535;
const INTERRUPTED_EXIT_CODE = 130;

const USAGE = `${style.bold("reflet live")} [--port <n>] [--no-open]

  Starts Reflet Live and opens its window: press Record there once, then talk
  while you move between your apps. Ctrl+C stops the recording.

  --port <n>   port of the Live window (default ${LIVE_HUB_DEFAULT_PORT})
  --no-open    do not open the Live window

${style.bold("reflet live watch")} [--timeout <seconds>] [--json]

  Prints what you said since the last call, for a coding agent.
`;

function portOf(value: string | undefined): number {
  if (value === undefined) {
    return LIVE_HUB_DEFAULT_PORT;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(`--port takes a whole number from 1 to ${MAX_PORT}`);
  }
  return port;
}

const say = (line: string) => {
  process.stdout.write(`${line}\n`);
};

const errorCodeOf = (error: unknown): unknown =>
  error instanceof Error && "code" in error ? error.code : undefined;

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return errorCodeOf(error) === "EPERM";
  }
}

async function openWindow(url: string): Promise<boolean> {
  const opened = await openLiveWindow(url);
  if (!opened) {
    say(`${SYMBOL.warn} Open ${url} in Chrome yourself.`);
  }
  return opened;
}

function eventLine(event: LiveHubEvent): string {
  switch (event.kind) {
    case "app-joined":
      return `+ ${terminalSafe(event.app.label)} joined (${terminalSafe(event.app.origin)})`;
    case "recording":
      return `${style.red("●")} Recording into Reflet (${terminalSafe(event.organizationName)})`;
    case "paused":
      return `${style.yellow("‖")} Paused`;
    case "stopped":
      return "■ Stopped";
    case "window-closed":
      return "Live window closed";
    default:
      return event satisfies never;
  }
}

async function reuseRunningHub(
  file: LiveHubFile | null,
  open: boolean
): Promise<number | null> {
  if (!(file && isProcessAlive(file.pid))) {
    return null;
  }
  const health = await fetchHubHealth(file);
  if (!health) {
    return null;
  }
  const running = `Reflet Live is already running (pid ${file.pid})`;
  if (health.windowConnected) {
    say(`${running} and its window is open.`);
  } else if (open && (await openWindow(liveWindowUrl(file.port)))) {
    say(`${running}. Opened its window again.`);
  } else {
    say(`${running} at ${liveWindowUrl(file.port)}.`);
  }
  return 0;
}

async function runHub(port: number, open: boolean): Promise<number> {
  let hub: LiveHub;
  try {
    hub = await startLiveHub({
      onEvent: (event) => say(eventLine(event)),
      port,
      windowDirectory: fileURLToPath(
        new URL("./live-window/", import.meta.url)
      ),
    });
  } catch (error) {
    if (errorCodeOf(error) === "EADDRINUSE") {
      process.stderr.write(
        `${SYMBOL.cross} Port ${port} is used by another program. Free it or pass --port <n>.\n`
      );
      return 1;
    }
    throw error;
  }
  await writeLiveHubFile({
    pid: process.pid,
    port: hub.port,
    secret: hub.secret,
  });

  say(`${style.bold("Reflet Live")} ${SYMBOL.bullet} ${hub.url}`);
  if (!open) {
    say(`Open ${hub.url} in Chrome, then press Record there.`);
  } else if (await openWindow(hub.url)) {
    say("Opened the Live window. Press Record there.");
  }
  const hasLiveSkill = [".claude/skills", ".agents/skills"].some((directory) =>
    nodeFileSystem.exists(
      join(homedir(), directory, LIVE_SKILL_NAME, "SKILL.md")
    )
  );
  if (!hasLiveSkill) {
    say(
      `Coding agent: run ${style.cyan("npx reflet-cli agent install --global")} once, then ${style.cyan("/reflet-live")}.`
    );
  }

  await once(process, "SIGINT");
  process.once("SIGINT", () => process.exit(INTERRUPTED_EXIT_CODE));
  say("Stopping the recording…");
  const finished = await hub.stopRecording(STOP_TIMEOUT_MS);
  if (!finished) {
    say(
      `${SYMBOL.warn} The Live window had not finished uploading: the last passages may be missing.`
    );
  }
  await hub.close();
  await removeLiveHubFile(process.pid);
  return 0;
}

export async function runLive(argv: string[]): Promise<number> {
  const [action, ...rest] = argv;
  if (action === "watch") {
    return await runLiveWatch(rest);
  }
  if (argv.includes("--help")) {
    process.stdout.write(USAGE);
    return 0;
  }
  const { values } = parseArgs({
    args: argv,
    options: { "no-open": { type: "boolean" }, port: { type: "string" } },
  });
  const port = portOf(values.port);
  const open = values["no-open"] !== true;

  const reused = await reuseRunningHub(await readLiveHubFile(), open);
  return reused ?? (await runHub(port, open));
}
