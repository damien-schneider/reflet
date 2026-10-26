// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { LiveWindowState } from "../../protocol";
import {
  liveHubHarness,
  TEST_APP_ID,
  windowHeaders,
  windowState,
} from "./hub-harness";

const storageHome = await mkdtemp(join(tmpdir(), "reflet-live-home-"));
vi.mock("node:os", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:os")>()),
  homedir: () => storageHome,
}));
afterAll(() => rm(storageHome, { force: true, recursive: true }));

const live = liveHubHarness(storageHome);
const {
  appHeaders,
  call,
  openWindowStream,
  postWindowStates,
  reportPresence,
  restartHubCollectingEvents,
  selectOnlyConnection,
  startFakeBackend,
} = live;

describe("Reflet Live hub guards", () => {
  it("refuses a page reaching it through another hostname", async () => {
    const response = await call("/live/connections", {
      headers: { ...windowHeaders, host: "evil.test" },
    });
    expect(response.status).toBe(403);
  });

  it("refuses an app call without the hub secret", async () => {
    const response = await call("/live/presence", { method: "POST" });
    expect(response.status).toBe(401);
  });

  it("refuses window calls missing the devtools header", async () => {
    const response = await call("/live/connections");
    expect(response.status).toBe(403);
  });

  it("only forwards the session calls an app needs", async () => {
    const response = await call("/live/api/v1/sessions/start", {
      body: { sessionId: "s1" },
      headers: appHeaders(),
      method: "POST",
    });
    expect(response.status).toBe(404);
  });

  it("refuses app captures for a session that is not the one recording", async () => {
    const response = await call("/live/api/v1/sessions/events", {
      body: { sessionId: "other" },
      headers: appHeaders(),
      method: "POST",
    });
    expect(response).toEqual({
      body: { error: "Reflet Live is not recording." },
      status: 409,
    });
  });

  it("tells a panel the Live window is closed when it sends a command", async () => {
    const response = await call("/live/command", {
      body: { action: "pause" },
      headers: appHeaders(),
      method: "POST",
    });
    expect(response).toEqual({
      body: {
        error:
          "The Reflet Live window is closed. Run npx reflet-cli live to reopen it.",
      },
      status: 409,
    });
  });
});

describe("Reflet Live window link", () => {
  it("tells a second window that the recording lives in the first one", async () => {
    const first = await openWindowStream();
    const second = await openWindowStream();
    expect(await second.next("elsewhere")).toEqual({ kind: "elsewhere" });
    first.close();
  });

  it("pauses the recording from an app and answers with the paused status", async () => {
    const window = await openWindowStream();
    await call("/live/window/state", {
      body: windowState("recording"),
      headers: windowHeaders,
      method: "POST",
    });
    const paused = call("/live/command", {
      body: { action: "pause" },
      headers: appHeaders(),
      method: "POST",
    });
    expect(await window.next("command")).toMatchObject({ action: "pause" });
    await call("/live/window/state", {
      body: windowState("paused"),
      headers: windowHeaders,
      method: "POST",
    });
    expect(await paused).toMatchObject({
      body: { state: "paused" },
      status: 200,
    });
    window.close();
  });

  it("resumes without announcing a stop, telling apps it is paused while the microphone reopens", async () => {
    const events = await restartHubCollectingEvents();
    const window = await openWindowStream();
    await postWindowStates([
      windowState("recording"),
      windowState("paused"),
      windowState("requesting"),
    ]);
    expect(await reportPresence()).toMatchObject({ state: "paused" });
    await postWindowStates([windowState("recording")]);
    expect(events).not.toContainEqual({ kind: "stopped" });
    window.close();
  });

  it("tells apps nothing records yet while the window asks for the microphone to start", async () => {
    const window = await openWindowStream();
    await postWindowStates([
      { ...windowState("requesting"), sessionId: null, startedAt: null },
    ]);
    expect(await reportPresence()).toMatchObject({
      session: null,
      state: "idle",
    });
    window.close();
  });

  it("stops a recording only once the window has uploaded everything", async () => {
    const window = await openWindowStream();
    const postState = (state: LiveWindowState) =>
      call("/live/window/state", {
        body: state,
        headers: windowHeaders,
        method: "POST",
      });
    await postState(windowState("recording"));
    let settled = false;
    const stopped = live.hub.stopRecording(5000).then((done) => {
      settled = true;
      return done;
    });
    expect(await window.next("command")).toMatchObject({ action: "stop" });
    await postState({ ...windowState("idle"), pendingUploads: 2 });
    expect(settled).toBe(false);
    await postState({ ...windowState("idle"), pendingUploads: 0 });
    expect(await stopped).toBe(true);
    window.close();
  });

  it("shows the window each app that reports presence", async () => {
    const window = await openWindowStream();
    await call("/live/presence", {
      body: {
        at: Date.now(),
        clientId: "tab-1",
        focused: true,
        frame: { path: "/", title: "Home" },
      },
      headers: appHeaders(),
      method: "POST",
    });
    await window.next("apps");
    expect(await window.next("apps")).toMatchObject({
      apps: [{ label: "reflet/apps/web", root: "/code/reflet/apps/web" }],
      focus: { appId: TEST_APP_ID, page: { path: "/", title: "Home" } },
    });
    window.close();
  });

  it("adopts a recording that a reopened hub hears about before its organization", async () => {
    const events = await restartHubCollectingEvents();
    const backend = await startFakeBackend(() => ({}));
    const window = await openWindowStream();
    await call("/live/window/state", {
      body: windowState("recording"),
      headers: windowHeaders,
      method: "POST",
    });
    expect((await selectOnlyConnection()).status).toBe(200);
    expect(events).toContainEqual({
      kind: "recording",
      organizationName: "Acme",
    });
    const capture = await call("/live/api/v1/sessions/events", {
      body: { events: [], sessionId: "s1" },
      headers: appHeaders(),
      method: "POST",
    });
    expect(capture.status).toBe(200);
    await vi.waitFor(() => {
      expect(backend.calls).toContain(
        "GET /api/v1/sessions/live?sessionId=s1&sinceMs=0"
      );
    });
    expect(backend.calls).toContain("POST /api/v1/sessions/events");
    window.close();
    await backend.close();
  });

  it("keeps reading the feed after Stop until the window's last uploads are in", async () => {
    const startedAt = Date.now();
    const backend = await startFakeBackend((feedCalls) => ({
      entries: Array.from({ length: feedCalls }, (_, index) => ({
        atMs: index * 1000,
        endMs: index * 1000 + 500,
        id: `p${index}`,
        lines: [`passage ${index}`],
        screenshotIds: [],
      })),
      screenshots: [],
      session: { collection: "recording", id: "s1", startedAt },
      transcription: { oldestRunningMs: null, running: 0 },
    }));
    const window = await openWindowStream();
    await window.next("feed");
    await selectOnlyConnection();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const postState = (state: LiveWindowState) =>
      call("/live/window/state", {
        body: state,
        headers: windowHeaders,
        method: "POST",
      });
    const latestPassageAfter = async (ms: number) => {
      const update = window.next("feed");
      await vi.advanceTimersByTimeAsync(ms);
      const message = await update;
      return message.kind === "feed" ? message.entries.at(-1)?.id : null;
    };
    try {
      await postState(windowState("recording"));
      expect(await latestPassageAfter(0)).toBe("p0");
      await postState({ ...windowState("idle"), pendingUploads: 1 });
      expect(await latestPassageAfter(2000)).toBe("p1");
      expect(await latestPassageAfter(2000)).toBe("p2");
    } finally {
      vi.useRealTimers();
      window.close();
      await backend.close();
    }
  });
});
