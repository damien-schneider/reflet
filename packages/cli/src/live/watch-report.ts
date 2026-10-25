import {
  describePlace,
  type LiveApp,
  type LiveHubEntry,
} from "reflet-sdk/live-hub";
import { SYMBOL, style, terminalSafe } from "../render";
import type { FollowedSession, WatchResult } from "./watch";

const LIVE_NOT_RUNNING =
  "Reflet Live is not running: start it with npx reflet-cli live.";

function screenshotsOf(entry: LiveHubEntry, saved: Map<string, string>) {
  return [...new Set(entry.screenshotIds)].map((id) => ({
    id,
    path: saved.get(id) ?? null,
  }));
}

export function jsonReport(
  result: WatchResult,
  saved: Map<string, string>
): string {
  return JSON.stringify(
    {
      apps: appsCited(result.entries).map(({ label, root }) => ({
        label,
        root,
      })),
      ended: result.ended,
      entries: result.entries.map((entry) => ({
        id: entry.id,
        lines: entry.lines,
        place: entry.place,
        screenshots: screenshotsOf(entry, saved),
      })),
      hubRunning: result.hubRunning,
      session: result.followed?.session ?? null,
      transcription: result.followed?.transcription ?? null,
    },
    null,
    2
  );
}

function appsCited(entries: LiveHubEntry[]): LiveApp[] {
  const apps = new Map<string, LiveApp>();
  for (const { place } of entries) {
    const app = place.kind === "app" ? place.app : place.lastApp;
    if (app) {
      apps.set(app.id, app);
    }
  }
  return [...apps.values()];
}

function appsLegend(entries: LiveHubEntry[]): string[] {
  const apps = appsCited(entries);
  if (apps.length === 0) {
    return [];
  }
  const width = Math.max(...apps.map(({ label }) => label.length));
  return [
    "",
    style.bold("Apps"),
    ...apps.map(
      ({ label, root }) =>
        `  ${terminalSafe(label.padEnd(width))}  ${terminalSafe(root)}`
    ),
  ];
}

function followedReport(
  result: WatchResult,
  followed: FollowedSession,
  saved: Map<string, string>
): string[] {
  const { session } = followed;
  const collection = result.ended ? "ended" : session.collection;
  const news =
    result.entries.length === 0
      ? "nothing new"
      : `${result.entries.length} new`;
  const entryLines = result.entries.flatMap((entry) => [
    style.cyan(
      terminalSafe(
        entry.place.kind === "app"
          ? `in ${describePlace(entry.place)}`
          : describePlace(entry.place)
      )
    ),
    ...entry.lines.map(terminalSafe),
    ...screenshotsOf(entry, saved).map(
      ({ id, path }) =>
        `  screenshot ${terminalSafe(id)}: ${path ? terminalSafe(path) : style.yellow("could not be downloaded")}`
    ),
  ]);
  return [
    `${style.bold(`Reflet Live (${terminalSafe(session.organizationName)})`)} ${SYMBOL.bullet} ${collection} ${SYMBOL.bullet} ${news}`,
    ...entryLines,
    ...appsLegend(result.entries),
  ];
}

function idleReport(result: WatchResult): string[] {
  return result.hubRunning
    ? ["Reflet Live is not recording. Press Record in the Live window."]
    : [LIVE_NOT_RUNNING];
}

export function textReport(
  result: WatchResult,
  saved: Map<string, string>
): string {
  const report = result.followed
    ? followedReport(result, result.followed, saved)
    : idleReport(result);
  const next = result.ended
    ? "The recording is over. Run reflet live watch again to follow the next one."
    : "Run reflet live watch again for what comes next.";
  return [...report, style.dim(next)].join("\n");
}
