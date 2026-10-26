import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { afterEach, beforeEach } from "vitest";
import { saveConnection } from "../../../devtools/server/connect/connection-store";
import {
  encodeLiveAppHeader,
  type LiveWindowMessage,
  type LiveWindowState,
} from "../../protocol";
import { type LiveHub, startLiveHub } from "../hub-server";
import type { LiveHubEvent } from "../hub-state";

export interface CallOptions {
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
}

export const windowHeaders = {
  "sec-fetch-site": "same-origin",
  "x-reflet-devtools": "1",
};

export const TEST_APP_ID = "http://localhost:3000|/code/reflet/apps/web";

export const windowState = (
  phase: LiveWindowState["phase"]
): LiveWindowState => ({
  canStart: true,
  limits: null,
  pauseReason: null,
  pendingUploads: 0,
  phase,
  sessionId: "s1",
  startedAt: Date.now(),
});

export function liveHubHarness(storageHome: string) {
  let hub: LiveHub | null = null;
  let windowDirectory = "";

  const current = (): LiveHub => {
    if (!hub) {
      throw new Error("The Reflet Live hub is not running.");
    }
    return hub;
  };

  beforeEach(async () => {
    windowDirectory = await mkdtemp(join(tmpdir(), "reflet-live-hub-"));
    hub = await startLiveHub({ port: 0, windowDirectory });
  });

  afterEach(async () => {
    await current().close();
    await rm(windowDirectory, { force: true, recursive: true });
    await rm(join(storageHome, ".reflet"), { force: true, recursive: true });
  });

  function send(path: string, options: CallOptions): Promise<IncomingMessage> {
    const { port } = current();
    return new Promise((resolve, reject) => {
      const outgoing = request(
        {
          headers: { host: `localhost:${port}`, ...options.headers },
          host: "127.0.0.1",
          method: options.method ?? "GET",
          path,
          port,
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

  const appHeaders = () => ({
    authorization: `Bearer ${current().secret}`,
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

  async function startFakeBackend(
    respond: (feedCalls: number, path: string) => unknown,
    status: (path: string) => number = () => 200
  ) {
    const calls: string[] = [];
    const feedCalls = () =>
      calls.filter((call) => call.startsWith("GET /api/v1/sessions/live"))
        .length;
    const server = createServer((incoming, outgoing) => {
      const path = incoming.url ?? "";
      calls.push(`${incoming.method} ${path}`);
      incoming.resume();
      outgoing.statusCode = status(path);
      outgoing.setHeader("content-type", "application/json");
      outgoing.end(JSON.stringify(respond(feedCalls(), path)));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
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
    const { body } = await call("/live/connections", {
      headers: windowHeaders,
    });
    return await call("/live/connection", {
      body: { id: body.connections[0].id },
      headers: windowHeaders,
      method: "POST",
    });
  }

  async function restartHubCollectingEvents(): Promise<LiveHubEvent[]> {
    const events: LiveHubEvent[] = [];
    await current().close();
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

  async function reportPresence(
    presence: { clientId?: string; focused?: boolean; path?: string } = {}
  ) {
    const { body } = await call("/live/presence", {
      body: {
        at: Date.now(),
        clientId: presence.clientId ?? "tab-1",
        focused: presence.focused ?? true,
        frame: { path: presence.path ?? "/", title: "Home" },
      },
      headers: appHeaders(),
      method: "POST",
    });
    return body;
  }

  return {
    appHeaders,
    call,
    get hub(): LiveHub {
      return current();
    },
    openWindowStream,
    postWindowStates,
    reportPresence,
    restartHubCollectingEvents,
    selectOnlyConnection,
    send,
    startFakeBackend,
  };
}
