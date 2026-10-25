import type { LiveApp, LiveHubEntry, LiveHubFeed } from "reflet-sdk/live-hub";
import { describe, expect, it } from "vitest";
import { type WatchState, watchLiveSession } from "../live/watch";
import { jsonReport, textReport } from "../live/watch-report";

type Session = NonNullable<LiveHubFeed["session"]>;

const RECORDING: Session = {
  collection: "recording",
  id: "s1",
  organizationName: "Acme",
  startedAt: 0,
};
const ENDED: Session = { ...RECORDING, collection: "ended" };

const app = (label: string, root: string): LiveApp => ({
  id: `http://localhost:3000|${root}`,
  label,
  origin: "http://localhost:3000",
  repoRoot: root,
  root,
});
const ELECTRON = app(
  "one-rec/apps/electron",
  "/Users/me/GitHub/one-rec/apps/electron"
);
const WEB = app("reflet/apps/web", "/Users/me/GitHub/reflet/apps/web");

const passage = (
  id: string,
  place: LiveHubEntry["place"] = { app: WEB, kind: "app", page: null }
): LiveHubEntry => ({
  atMs: 0,
  endMs: 0,
  id,
  lines: [`[00:00] ${id}`],
  place,
  screenshotIds: [],
});

function feed(
  session: Session | null,
  entries: Array<string | LiveHubEntry>,
  running = 0
): LiveHubFeed {
  return {
    entries: entries.map((entry) =>
      typeof entry === "string" ? passage(entry) : entry
    ),
    screenshots: [],
    session,
    transcription: { running },
  };
}

function scriptedWatch(script: (atMs: number) => LiveHubFeed | null) {
  let atMs = 0;
  const ports = {
    fetchFeed: () => Promise.resolve(script(atMs)),
    now: () => atMs,
    sleep: (ms: number) => {
      atMs += ms;
      return Promise.resolve();
    },
  };
  return {
    elapsedMs: () => atMs,
    watch: (state: WatchState | null, timeoutMs = 90_000) =>
      watchLiveSession(ports, { state, timeoutMs }),
  };
}

const idsOf = (entries: LiveHubEntry[]) => entries.map(({ id }) => id);

describe("live watch", () => {
  it("hands over a thought once the developer pauses and it is transcribed", async () => {
    const { elapsedMs, watch } = scriptedWatch((atMs) =>
      atMs < 4000 ? feed(RECORDING, ["a"], 1) : feed(RECORDING, ["a", "b"])
    );

    const result = await watch(null);

    expect(idsOf(result.entries)).toEqual(["a", "b"]);
    expect(elapsedMs()).toBeGreaterThanOrEqual(9000);
    expect(result.state).toEqual({
      delivered: ["a", "b"],
      ended: false,
      sessionId: "s1",
    });
  });

  it("never hands the same passage twice, but hands over its retranscription", async () => {
    let entryIds = ["a@0"];
    const { watch } = scriptedWatch(() => feed(RECORDING, entryIds));
    const first = await watch(null);

    const repeat = await watch(first.state, 10_000);
    entryIds = ["a@1"];
    const retranscribed = await watch(repeat.state);

    expect(idsOf(repeat.entries)).toEqual([]);
    expect(idsOf(retranscribed.entries)).toEqual(["a@1"]);
  });

  it("hands over mid-speech at the deadline instead of waiting forever", async () => {
    const { elapsedMs, watch } = scriptedWatch((atMs) =>
      feed(
        RECORDING,
        Array.from({ length: atMs / 2000 + 1 }, (_, index) => `p${index}`)
      )
    );

    const result = await watch(null, 10_000);

    expect(elapsedMs()).toBe(10_000);
    expect(idsOf(result.entries)).toEqual(["p0", "p1", "p2", "p3", "p4", "p5"]);
  });

  it("ignores a recording that ended before the agent watched, then follows the next one", async () => {
    let current = feed(ENDED, ["old"]);
    const { watch } = scriptedWatch(() => current);

    const before = await watch(null, 10_000);
    current = feed({ ...RECORDING, id: "s2" }, ["new"]);
    const next = await watch(before.state);

    expect(before.entries).toEqual([]);
    expect(before.followed).toBeNull();
    expect(next.followed?.session.id).toBe("s2");
    expect(idsOf(next.entries)).toEqual(["new"]);
  });

  it("flushes the last passages once when the followed recording ends", async () => {
    const { elapsedMs, watch } = scriptedWatch((atMs) =>
      atMs < 4000 ? feed(ENDED, ["a", "b"], 1) : feed(ENDED, ["a", "b", "c"])
    );
    const following = { delivered: ["a"], ended: false, sessionId: "s1" };

    const end = await watch(following);
    const afterEnd = await watch(end.state, 10_000);

    expect(elapsedMs()).toBe(14_000);
    expect(end.ended).toBe(true);
    expect(idsOf(end.entries)).toEqual(["b", "c"]);
    expect(afterEnd.ended).toBe(false);
    expect(afterEnd.entries).toEqual([]);
    expect(afterEnd.followed).toBeNull();
  });

  it("keeps waiting while Reflet Live is not running, then follows it once started", async () => {
    const { watch } = scriptedWatch((atMs) =>
      atMs < 20_000 ? null : feed(RECORDING, ["a"])
    );

    const result = await watch(null);

    expect(result.hubRunning).toBe(true);
    expect(idsOf(result.entries)).toEqual(["a"]);
  });

  it("says Reflet Live is not running when it never started before the timeout", async () => {
    const { elapsedMs, watch } = scriptedWatch(() => null);

    const result = await watch(null, 10_000);

    expect(elapsedMs()).toBe(10_000);
    expect(result.hubRunning).toBe(false);
    expect(textReport(result, new Map())).toContain(
      "Reflet Live is not running: start it with npx reflet-cli live."
    );
  });
});

describe("live watch report", () => {
  const entries = [
    passage("a", {
      app: ELECTRON,
      kind: "app",
      page: { path: "/export", title: "Export" },
    }),
    passage("b", { app: WEB, kind: "app", page: { path: "/", title: null } }),
    passage("c", { kind: "outside", lastApp: ELECTRON }),
  ];

  async function handedOver() {
    const { watch } = scriptedWatch(() => feed(RECORDING, entries));
    return await watch(null);
  }

  it("says which app and page each passage is about, and where each app lives", async () => {
    const lines = textReport(await handedOver(), new Map()).split("\n");

    expect(lines).toEqual(
      expect.arrayContaining([
        "in one-rec/apps/electron · Export (/export)",
        "in reflet/apps/web · /",
        "outside your apps (last: one-rec/apps/electron)",
        "Apps",
        "  one-rec/apps/electron  /Users/me/GitHub/one-rec/apps/electron",
        "  reflet/apps/web        /Users/me/GitHub/reflet/apps/web",
      ])
    );
    expect(lines.indexOf("in one-rec/apps/electron · Export (/export)")).toBe(
      lines.indexOf("[00:00] a") - 1
    );
  });

  it("gives each JSON entry its place and lists where each cited app lives", async () => {
    const report = JSON.parse(jsonReport(await handedOver(), new Map()));

    expect(report.entries[2].place).toEqual({
      kind: "outside",
      lastApp: ELECTRON,
    });
    expect(report.apps).toEqual([
      { label: "one-rec/apps/electron", root: ELECTRON.root },
      { label: "reflet/apps/web", root: WEB.root },
    ]);
  });
});
