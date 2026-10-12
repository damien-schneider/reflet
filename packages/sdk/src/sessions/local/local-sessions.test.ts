import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionApiError } from "../api/session-api";
import { createFakeSessionServer } from "../testing/fake-session-server";
import { createMemorySessionStore } from "../testing/memory-session-store";
import { createLocalSessions, type LocalSessions } from "./local-sessions";
import type { StoredDraft } from "./session-store";

function draft(overrides: Partial<StoredDraft>): StoredDraft {
  return {
    accountKey: "org:ada",
    gaps: [],
    lastActiveAt: 61_000,
    sessionId: "id-s1",
    sessionKey: "s1",
    startedAt: 1000,
    state: "recording",
    surface: "devtools",
    title: "Checkout",
    ...overrides,
  };
}

async function setup(drafts: StoredDraft[]) {
  const store = createMemorySessionStore();
  for (const stored of drafts) {
    await store.writeDraft(stored);
  }
  const server = createFakeSessionServer();
  const local = createLocalSessions(store);
  return { local, server, store };
}

async function loadedDrafts(local: LocalSessions, accountKey: string) {
  local.subscribe(() => undefined);
  local.refreshDrafts(accountKey);
  await vi.runAllTimersAsync();
  return local.getDrafts(accountKey);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("createLocalSessions", () => {
  it("reports drafts left recording by a reload as interrupted", async () => {
    const { local, server } = await setup([
      draft({ sessionKey: "s1" }),
      draft({ sessionKey: "s2", state: "paused" }),
    ]);
    const account = local.connect({
      accountKey: "org:ada",
      api: server.api,
      maxLocalBufferBytes: 1_000_000,
    });
    account.claim({ halt: vi.fn(), sessionKey: "s2" });
    const drafts = await loadedDrafts(local, "org:ada");
    expect(
      Object.fromEntries(drafts.map((item) => [item.sessionKey, item.state]))
    ).toEqual({ s1: "interrupted", s2: "paused" });
  });

  it("closes a discarded draft on the server and forgets it once uploaded", async () => {
    const { local, server } = await setup([draft({})]);
    await local.discardDraft({
      accountKey: "org:ada",
      api: server.api,
      sessionKey: "s1",
    });
    await vi.runAllTimersAsync();
    expect(server.callsTo("/api/v1/sessions/collection")).toEqual([
      {
        action: "end",
        atMs: 60_000,
        reason: "interrupted",
        sessionId: "id-s1",
      },
    ]);
    expect(server.callsTo("/api/v1/sessions/analyze")).toEqual([
      { sessionId: "id-s1" },
    ]);
    expect(await loadedDrafts(local, "org:ada")).toEqual([]);
  });

  it("purges one account: live recording halted, drafts and uploads dropped", async () => {
    const { local, server, store } = await setup([
      draft({}),
      draft({ accountKey: "org:bob", sessionKey: "s3" }),
    ]);
    const account = local.connect({
      accountKey: "org:ada",
      api: server.api,
      maxLocalBufferBytes: 1_000_000,
    });
    const halt = vi.fn();
    account.claim({ halt, sessionKey: "s1" });
    server.failNext("/api/v1/sessions/events", new TypeError("offline"));
    await account.outbox.enqueue("s1", {
      clientKey: "e1",
      events: [],
      kind: "events",
    });
    await local.purgeAccount("org:ada");
    expect(halt).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "auth" })
    );
    expect(await store.readDrafts("org:ada")).toEqual([]);
    expect(await store.readOperations("org:ada")).toEqual([]);
    expect(await store.readDrafts("org:bob")).toHaveLength(1);
  });

  it("purges the account when Reflet rejects its credential", async () => {
    const { local, server, store } = await setup([draft({})]);
    const account = local.connect({
      accountKey: "org:ada",
      api: server.api,
      maxLocalBufferBytes: 1_000_000,
    });
    const halt = vi.fn();
    account.claim({ halt, sessionKey: "s1" });
    server.failNext(
      "/api/v1/sessions/analyze",
      new SessionApiError("Invalid token", { limit: null, status: 401 })
    );
    await account.outbox.enqueue("s1", { kind: "analyze" });
    await vi.runAllTimersAsync();
    expect(halt).toHaveBeenCalled();
    expect(await store.readDrafts("org:ada")).toEqual([]);
    expect(local.getSyncSnapshot("org:ada").blockedBy).toBe("auth");
  });
});
