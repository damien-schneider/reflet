import { describe, expect, it } from "vitest";
import type { LiveEntry, LiveFeed, LiveSession } from "../live/live-feed";
import { type WatchState, watchLiveSession } from "../live/watch";

const RECORDING: LiveSession = {
  collection: "recording",
  id: "s1",
  title: "Checkout",
};
const ENDED: LiveSession = { ...RECORDING, collection: "ended" };

const passage = (id: string): LiveEntry => ({
  id,
  lines: [`[00:00] ${id}`],
  screenshotIds: [],
});

function feed(
  session: LiveSession | null,
  entryIds: string[],
  running = 0
): LiveFeed {
  return {
    entries: entryIds.map(passage),
    screenshots: [],
    session,
    transcription: { failed: 0, running },
  };
}

function scriptedWatch(script: (atMs: number) => LiveFeed) {
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

const idsOf = (entries: LiveEntry[]) => entries.map(({ id }) => id);

describe("session watch", () => {
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

  it("ignores a session that ended before the agent watched, then follows the next one", async () => {
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

  it("flushes the last passages once when the followed session ends", async () => {
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
});
