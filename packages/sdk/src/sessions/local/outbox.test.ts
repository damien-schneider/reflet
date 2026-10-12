import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionApiError } from "../api/session-api";
import { createFakeSessionServer } from "../testing/fake-session-server";
import { createMemorySessionStore } from "../testing/memory-session-store";
import { createOutbox, type OutboxIssue } from "./outbox";
import type { SessionLocalStore, StoredDraft } from "./session-store";

const ACCOUNT = "org:user";

function draft(sessionKey: string): StoredDraft {
  return {
    accountKey: ACCOUNT,
    gaps: [],
    lastActiveAt: 0,
    sessionId: null,
    sessionKey,
    startedAt: 0,
    state: "recording",
    surface: "devtools",
    title: "",
  };
}

function startPayload(sessionKey: string) {
  return {
    body: {
      clientKey: sessionKey,
      page: { title: "Home", url: "https://app.test/" },
      startedAt: 0,
      surface: "devtools" as const,
    },
    kind: "start" as const,
  };
}

function eventsPayload(clientKey: string) {
  return {
    clientKey,
    events: [{ atMs: 1, kind: "scroll" as const, scrollX: 0, scrollY: 10 }],
    kind: "events" as const,
  };
}

async function setup(
  options: { maxLocalBufferBytes?: number; store?: SessionLocalStore } = {}
) {
  const server = createFakeSessionServer();
  const store = options.store ?? createMemorySessionStore();
  await store.writeDraft(draft("a"));
  await store.writeDraft(draft("b"));
  const issues: OutboxIssue[] = [];
  const outbox = createOutbox({
    accountKey: ACCOUNT,
    api: server.api,
    maxLocalBufferBytes: options.maxLocalBufferBytes ?? 1_000_000,
    onDraftsChanged: vi.fn(),
    store,
  });
  outbox.subscribeIssues((issue) => issues.push(issue));
  return { issues, outbox, server, store };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("createOutbox", () => {
  it("sends a session's operations in order once its start resolved the server id", async () => {
    const { outbox, server, store } = await setup();
    await outbox.enqueue("a", startPayload("a"));
    await outbox.enqueue("a", eventsPayload("e1"));
    await outbox.enqueue("a", {
      audio: new Blob(["wav"], { type: "audio/wav" }),
      clientKey: "v1",
      endMs: 900,
      kind: "voice",
      startMs: 100,
      storageId: null,
    });
    await vi.runAllTimersAsync();
    expect(server.calls.map((call) => call.path)).toEqual([
      "/api/v1/sessions/start",
      "/api/v1/sessions/events",
      "/api/v1/sessions/upload-url",
      "/api/v1/sessions/segments",
    ]);
    expect(server.callsTo("/api/v1/sessions/segments")).toEqual([
      {
        audioStorageId: "storage-1",
        clientKey: "v1",
        endMs: 900,
        sessionId: "id-a",
        startMs: 100,
      },
    ]);
    expect(outbox.getSnapshot()).toMatchObject({
      pendingBytes: 0,
      pendingOperations: 0,
    });
    expect((await store.readDrafts(ACCOUNT))[0]?.sessionId).toBe("id-a");
  });

  it("retries with backoff, reusing the same client key", async () => {
    const { outbox, server } = await setup();
    server.failNext("/api/v1/sessions/start", new TypeError("offline"));
    server.failNext("/api/v1/sessions/start", new TypeError("offline"));
    await outbox.enqueue("a", startPayload("a"));
    await outbox.enqueue("a", eventsPayload("e1"));
    await vi.advanceTimersByTimeAsync(0);
    expect(server.callsTo("/api/v1/sessions/events")).toEqual([]);
    expect(outbox.getSnapshot().lastError).toBe("offline");
    await vi.advanceTimersByTimeAsync(1000);
    expect(server.callsTo("/api/v1/sessions/start")).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(2000);
    const starts = server.callsTo("/api/v1/sessions/start");
    expect(starts).toHaveLength(3);
    expect(new Set(starts.map((body) => JSON.stringify(body))).size).toBe(1);
    expect(server.callsTo("/api/v1/sessions/events")).toHaveLength(1);
    expect(outbox.getSnapshot().pendingOperations).toBe(0);
  });

  it("drops every operation of a session the server no longer knows", async () => {
    const { issues, outbox, server, store } = await setup();
    server.failNext(
      "/api/v1/sessions/start",
      new SessionApiError("Not found", { limit: null, status: 404 })
    );
    await outbox.enqueue("a", startPayload("a"));
    await outbox.enqueue("a", eventsPayload("e1"));
    await outbox.enqueue("b", startPayload("b"));
    await vi.runAllTimersAsync();
    expect(server.callsTo("/api/v1/sessions/start")).toHaveLength(2);
    expect(server.callsTo("/api/v1/sessions/events")).toEqual([]);
    expect(issues).toEqual([{ kind: "sessionGone", sessionKey: "a" }]);
    expect((await store.readDrafts(ACCOUNT)).map((d) => d.sessionKey)).toEqual([
      "b",
    ]);
    expect(outbox.getSnapshot().pendingOperations).toBe(0);
  });

  it("blocks on a rejected credential and reports it", async () => {
    const { issues, outbox, server } = await setup();
    server.failNext(
      "/api/v1/sessions/start",
      new SessionApiError("Invalid token", { limit: null, status: 401 })
    );
    await outbox.enqueue("a", startPayload("a"));
    await vi.runAllTimersAsync();
    await outbox.enqueue("b", startPayload("b"));
    await vi.runAllTimersAsync();
    expect(server.callsTo("/api/v1/sessions/start")).toHaveLength(1);
    expect(issues).toEqual([{ kind: "auth" }]);
    expect(outbox.getSnapshot().blockedBy).toBe("auth");
  });

  it("reports a session limit and keeps sending the rest", async () => {
    const { issues, outbox, server } = await setup();
    server.failNext(
      "/api/v1/sessions/events",
      new SessionApiError("Too many events", { limit: "events", status: 413 })
    );
    await outbox.enqueue("a", startPayload("a"));
    await outbox.enqueue("a", eventsPayload("e1"));
    await outbox.enqueue("a", { kind: "analyze" });
    await vi.runAllTimersAsync();
    expect(issues).toEqual([
      { kind: "limit", limit: "events", sessionKey: "a" },
    ]);
    expect(server.callsTo("/api/v1/sessions/analyze")).toEqual([
      { sessionId: "id-a" },
    ]);
  });

  it("reports a storage failure instead of losing the operation silently", async () => {
    const store = createMemorySessionStore();
    const { outbox } = await setup({
      store: {
        ...store,
        addOperation: () => Promise.reject(new Error("QuotaExceededError")),
      },
    });
    await expect(outbox.enqueue("a", startPayload("a"))).rejects.toThrow();
    expect(outbox.getSnapshot().blockedBy).toBe("storage");
  });

  it("refuses to buffer more than the local byte budget", async () => {
    const { outbox, server } = await setup({ maxLocalBufferBytes: 1000 });
    server.failNext("/api/v1/sessions/start", new TypeError("offline"));
    const voice = (clientKey: string) => ({
      audio: new Blob([new Uint8Array(600)], { type: "audio/wav" }),
      clientKey,
      endMs: 1,
      kind: "voice" as const,
      startMs: 0,
      storageId: null,
    });
    await outbox.enqueue("a", startPayload("a"));
    await outbox.enqueue("a", voice("v1"));
    await expect(outbox.enqueue("a", voice("v2"))).rejects.toThrow();
    expect(outbox.getSnapshot()).toMatchObject({
      blockedBy: "storage",
      pendingOperations: 2,
    });
  });
});
