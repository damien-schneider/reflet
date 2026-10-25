// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { saveConnection } from "../../../devtools/server/connect/connection-store";
import {
  encodeLiveAppHeader,
  type LiveWindowMessage,
  type LiveWindowState,
} from "../../protocol";
import { type LiveHub, startLiveHub } from "../hub-server";
import type { LiveHubEvent } from "../hub-state";

const storageHome = await mkdtemp(join(tmpdir(), "reflet-live-home-"));
vi.mock("node:os", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:os")>()),
  homedir: () => storageHome,
}));
afterAll(() => rm(storageHome, { force: true, recursive: true }));

let hub: LiveHub;
let windowDirectory: string;

beforeEach(async () => {
  windowDirectory = await mkdtemp(join(tmpdir(), "reflet-live-hub-"));
  hub = await startLiveHub({ port: 0, windowDirectory });
});

afterEach(async () => {
  await hub.close();
  await rm(windowDirectory, { force: true, recursive: true });
  await rm(join(storageHome, ".reflet"), { force: true, recursive: true });
});

interface CallOptions {
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
}

function send(path: string, options: CallOptions): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const outgoing = request(
      {
        headers: { host: `localhost:${hub.port}`, ...options.headers },
        host: "127.0.0.1",
        method: options.method ?? "GET",
        path,
        port: hub.port,
      },
      resolve
    );
    outgoing.once("error", reject);
    outgoing.end(
      options.body === undefined ? undefined : JSON.stringify(options.body)
    );
  });
}

async function call(path: string, options: CallOptions = {}) {
  const response = await send(path, options);
  let text = "";
  for await (const chunk of response) {
    text += String(chunk);
  }
  return { body: JSON.parse(text), status: response.statusCode };
}

const windowHeaders = {
  "sec-fetch-site": "same-origin",
  "x-reflet-devtools": "1",
};
const appHeaders = () => ({
  authorization: `Bearer ${hub.secret}`,
  "x-reflet-live-app": encodeLiveAppHeader({
    origin: "http://localhost:3000",
    root: "/code/reflet/apps/web",
    workspaceRoot: "/code/reflet",
  }),
});

async function openWindowStream() {
  const response = await send("/live/window/stream", {
    headers: windowHeaders,
  });
  const lines = createInterface({ input: response })[Symbol.asyncIterator]();
  return {
    close: () => response.destroy(),
    async next(kind: LiveWindowMessage["kind"]): Promise<LiveWindowMessage> {
      for (;;) {
        const line = await lines.next();
        if (line.done) {
          throw new Error(`The stream ended before a ${kind} message.`);
        }
        const message: LiveWindowMessage = JSON.parse(line.value);
        if (message.kind === kind) {
          return message;
        }
      }
    },
  };
}

const windowState = (phase: LiveWindowState["phase"]): LiveWindowState => ({
  canStart: true,
  limits: null,
  pauseReason: null,
  pendingUploads: 0,
  phase,
  sessionId: "s1",
  startedAt: Date.now(),
});

async function startFakeBackend(respond: (feedCalls: number) => unknown) {
  const calls: string[] = [];
  const feedCalls = () =>
    calls.filter((call) => call.startsWith("GET /api/v1/sessions/live")).length;
  const server = createServer((incoming, outgoing) => {
    calls.push(`${incoming.method} ${incoming.url}`);
    incoming.resume();
    outgoing.setHeader("content-type", "application/json");
    outgoing.end(JSON.stringify(respond(feedCalls())));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const apiUrl =
    typeof address === "object" && address
      ? `http://127.0.0.1:${address.port}`
      : "";
  await saveConnection("/code/reflet", {
    apiUrl,
    organizationName: "Acme",
    token: "fb_dev_acme",
  });
  return {
    calls,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function selectOnlyConnection() {
  const { body } = await call("/live/connections", { headers: windowHeaders });
  return await call("/live/connection", {
    body: { id: body.connections[0].id },
    headers: windowHeaders,
    method: "POST",
  });
}

async function restartHubCollectingEvents(): Promise<LiveHubEvent[]> {
  const events: LiveHubEvent[] = [];
  await hub.close();
  hub = await startLiveHub({
    onEvent: (event) => {
      events.push(event);
    },
    port: 0,
    windowDirectory,
  });
  return events;
}

async function postWindowStates(states: LiveWindowState[]) {
  for (const state of states) {
    await call("/live/window/state", {
      body: state,
      headers: windowHeaders,
      method: "POST",
    });
  }
}

async function reportPresence() {
  const { body } = await call("/live/presence", {
    body: {
      at: Date.now(),
      clientId: "tab-1",
      focused: true,
      frame: { path: "/", title: "Home" },
    },
    headers: appHeaders(),
    method: "POST",
  });
  return body;
}

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
    const stopped = hub.stopRecording(5000).then((done) => {
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
      focusedAppId: "http://localhost:3000|/code/reflet/apps/web",
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
