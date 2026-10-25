// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { LiveApp } from "../../../protocol";
import {
  type BackendLiveFeed,
  type FeedSnapshot,
  initialFeed,
  mergeFeed,
} from "../feed-cache";

const web: LiveApp = {
  id: "http://localhost:3000|/code/web",
  label: "web",
  origin: "http://localhost:3000",
  repoRoot: "/code/web",
  root: "/code/web",
};
const session = { id: "s1", organizationName: "Acme", startedAt: 1000 };
const context = (nowMs: number) => ({
  nowMs,
  organizationName: "Acme",
  transitions: [{ app: web, atMs: 0, frame: { path: "/", title: null } }],
});

const passage = (id: string, atMs: number, text: string) => ({
  atMs,
  endMs: atMs + 2000,
  id,
  lines: [text],
  screenshotIds: [],
});

const backendFeed = (
  entries: BackendLiveFeed["entries"],
  oldestRunningMs: number | null = null
): BackendLiveFeed => ({
  entries,
  screenshots: [],
  session: { collection: "recording", id: "s1", startedAt: 1000 },
  transcription: { oldestRunningMs, running: oldestRunningMs === null ? 0 : 1 },
});

const texts = (snapshot: FeedSnapshot) =>
  snapshot.feed.entries.map((entry) => entry.lines[0]);

describe("merging the backend feed", () => {
  it("keeps settled passages and lets the next fetch rewrite the recent ones", () => {
    const first = mergeFeed(
      initialFeed(session),
      backendFeed([
        passage("a", 10_000, "settled"),
        passage("b", 150_000, "draft"),
        passage("c", 160_000, "dropped later"),
      ]),
      context(200_000)
    );
    const second = mergeFeed(
      first,
      backendFeed([
        passage("b", 150_000, "final"),
        passage("d", 170_000, "new"),
      ]),
      context(202_000)
    );
    expect(texts(second)).toEqual(["settled", "final", "new"]);
    expect(second.feed.entries[0]?.place).toEqual({
      app: web,
      kind: "app",
      page: { path: "/", title: null },
    });
  });

  it("asks again from the oldest passage still being transcribed", () => {
    const running = mergeFeed(
      initialFeed(session),
      backendFeed([passage("a", 30_000, "")], 30_000),
      context(600_000)
    );
    expect(running.cursorMs).toBe(30_000);
    const settled = mergeFeed(running, backendFeed([]), context(600_000));
    expect(settled.cursorMs).toBe(540_000);
    const stillSettled = mergeFeed(
      settled,
      backendFeed([], 10_000),
      context(601_000)
    );
    expect(stillSettled.cursorMs).toBe(540_000);
  });
});
