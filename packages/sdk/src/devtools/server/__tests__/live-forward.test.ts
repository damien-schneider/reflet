// @vitest-environment node
import { execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { writeLiveHubFile } from "../../../live/hub/hub-file";
import { startLiveHub } from "../../../live/hub/hub-server";
import {
  decodeLiveAppHeader,
  LIVE_APP_HEADER,
  LIVE_STATUS_OFF,
  type LiveStatus,
} from "../../../live/protocol";
import { liveTransport } from "../../client/live/live-route";
import { DEVTOOLS_REQUEST_HEADER, DEVTOOLS_ROUTE_BASE } from "../../protocol";
import { createDevtoolsHandler } from "../handler";

const ORIGIN = "http://localhost:3000";
const SECRET = "ab".repeat(32);
const IDLE: LiveStatus = {
  canStart: true,
  organizationName: "Acme",
  session: null,
  state: "idle",
};

const sandbox = mkdtempSync(join(tmpdir(), "reflet-live-forward-"));
const handler = createDevtoolsHandler({ root: sandbox }, {});

function liveRequest(path: string, body: unknown): Request {
  return new Request(`${ORIGIN}${DEVTOOLS_ROUTE_BASE}${path}`, {
    body: JSON.stringify(body),
    headers: {
      [DEVTOOLS_REQUEST_HEADER]: "1",
      "sec-fetch-site": "same-origin",
    },
    method: "POST",
  });
}

const presence = {
  at: 1000,
  clientId: "client-1",
  focused: true,
  frame: { path: "/export", title: "Export" },
};

beforeAll(() => {
  execFileSync("git", ["init", "--quiet"], { cwd: sandbox });
});

afterAll(() => {
  rmSync(sandbox, { force: true, recursive: true });
});

beforeEach(() => {
  vi.stubEnv("HOME", sandbox);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(join(sandbox, ".reflet"), { force: true, recursive: true });
});

describe("live forwarder without a running hub", () => {
  it("reports Reflet Live as off to a page sending presence", async () => {
    const response = await handler(liveRequest("/live/presence", presence));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(LIVE_STATUS_OFF);
  });

  it("refuses commands with a message saying Live is not running", async () => {
    const response = await handler(
      liveRequest("/live/command", { action: "pause" })
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Reflet Live is not running.",
    });
  });
});

describe("live forwarder with a running hub", () => {
  let hub: Server;
  let received: { body: string; headers: IncomingHttpHeaders; url: string }[];

  beforeEach(async () => {
    received = [];
    hub = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        received.push({
          body,
          headers: request.headers,
          url: request.url ?? "",
        });
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify(IDLE));
      });
    });
    await once(hub.listen(0, "127.0.0.1"), "listening");
    const address = hub.address();
    if (address === null || typeof address === "string") {
      throw new Error("The fake hub is not listening on a TCP port.");
    }
    await writeLiveHubFile({
      pid: process.pid,
      port: address.port,
      secret: SECRET,
    });
  });

  afterEach(async () => {
    hub.close();
    await once(hub, "close");
  });

  it("forwards presence with the hub secret and this app's identity", async () => {
    const response = await handler(liveRequest("/live/presence", presence));

    expect(await response.json()).toEqual(IDLE);
    const [call] = received;
    expect(call?.url).toBe("/live/presence");
    expect(JSON.parse(call?.body ?? "")).toEqual(presence);
    expect(call?.headers.authorization).toBe(`Bearer ${SECRET}`);
    const root = realpathSync(sandbox);
    expect(decodeLiveAppHeader(String(call?.headers[LIVE_APP_HEADER]))).toEqual(
      { origin: ORIGIN, root, workspaceRoot: root }
    );
  });
});

describe("live captures sent by a page", () => {
  it("reach the Reflet Live hub, which refuses them while nothing records", async () => {
    const hub = await startLiveHub({ port: 0, windowDirectory: sandbox });
    await writeLiveHubFile({
      pid: process.pid,
      port: hub.port,
      secret: hub.secret,
    });
    const networkFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input !== "string" || !input.startsWith("/")) {
        return networkFetch(input, init);
      }
      const headers = new Headers(init?.headers);
      headers.set("sec-fetch-site", "same-origin");
      return handler(new Request(`${ORIGIN}${input}`, { ...init, headers }));
    });
    try {
      await expect(
        liveTransport("/api/v1/sessions/events", {
          body: { clientKey: "click-1", events: [], sessionId: "s1" },
        })
      ).rejects.toMatchObject({
        message: "Reflet Live is not recording.",
        status: 409,
      });
    } finally {
      vi.unstubAllGlobals();
      await hub.close();
    }
  });
});
