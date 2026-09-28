// @vitest-environment node
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { DEVTOOLS_REQUEST_HEADER, DEVTOOLS_ROUTE_BASE } from "../../protocol";
import { readConnection } from "../connect/connection-store";
import { createDevtoolsHandler } from "../handler";

const API_URL = "https://api.reflet.test";
const APP_URL = "https://app.reflet.test";
const ORIGIN = "http://localhost:3000";
const PUBLIC_KEY = "fb_pub_widget";
const DEV_TOKEN = "fb_dev_stored_token";
const CALLBACK_URI = `${ORIGIN}${DEVTOOLS_ROUTE_BASE}/connect/callback`;

const sandbox = mkdtempSync(join(tmpdir(), "reflet-devtools-connect-"));
const connectionsFile = join(
  sandbox,
  ".reflet",
  "devtools",
  `${createHash("sha256")
    .update(JSON.stringify([sandbox, API_URL]))
    .digest("hex")}.json`
);

vi.mock("node:os", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:os")>()),
  homedir: () => sandbox,
}));

const handler = createDevtoolsHandler(
  { root: sandbox },
  { REFLET_API_URL: API_URL, REFLET_APP_URL: `${APP_URL}/` }
);

function devtoolsRequest(path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set(DEVTOOLS_REQUEST_HEADER, "1");
  return new Request(`${ORIGIN}${DEVTOOLS_ROUTE_BASE}${path}`, {
    ...init,
    headers,
  });
}

function browserNavigation(url: string): Request {
  return new Request(url, { headers: { "sec-fetch-site": "cross-site" } });
}

async function startConnect(): Promise<URL> {
  const response = await handler(
    devtoolsRequest("/connect/start", {
      body: JSON.stringify({ publicKey: PUBLIC_KEY }),
      method: "POST",
    })
  );
  expect(response.status).toBe(200);
  return new URL((await response.json()).authorizeUrl);
}

function tokenEndpoint(organizationName: string) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ organizationName, token: DEV_TOKEN }), {
        status: 200,
      })
  );
}

async function connect(organizationName = "Acme"): Promise<Response> {
  const authorizeUrl = await startConnect();
  vi.stubGlobal("fetch", tokenEndpoint(organizationName));
  const state = authorizeUrl.searchParams.get("state");
  return await handler(
    browserNavigation(`${CALLBACK_URI}?code=one-time&state=${state}`)
  );
}

async function boardStatus(request = devtoolsRequest("/status")) {
  return (await (await handler(request)).json()).board;
}

beforeEach(() => {
  rmSync(join(sandbox, ".reflet"), { force: true, recursive: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  rmSync(sandbox, { force: true, recursive: true });
});

describe("board access status", () => {
  it("offers Connect on localhost when nothing is configured", async () => {
    expect(await boardStatus()).toEqual({
      canConnect: true,
      kind: "disconnected",
    });
  });

  it("does not offer Connect on a custom dev hostname Reflet would refuse", async () => {
    const custom = createDevtoolsHandler(
      { root: sandbox },
      { REFLET_DEVTOOLS_HOSTS: "dev.acme.internal" }
    );
    const response = await custom(
      new Request(
        `http://dev.acme.internal:3000${DEVTOOLS_ROUTE_BASE}/status`,
        {
          headers: { [DEVTOOLS_REQUEST_HEADER]: "1" },
        }
      )
    );
    expect((await response.json()).board).toEqual({
      canConnect: false,
      kind: "disconnected",
    });
  });

  it("reports the secret key before any stored connection", async () => {
    await connect();
    const withKey = createDevtoolsHandler(
      { root: sandbox },
      { REFLET_API_URL: API_URL, REFLET_SECRET_KEY: "fb_sec_key" }
    );
    const response = await withKey(devtoolsRequest("/status"));
    expect((await response.json()).board).toEqual({ kind: "secretKey" });
  });
});

describe("connect flow", () => {
  it("sends the browser to the Reflet consent page with a PKCE challenge", async () => {
    const authorizeUrl = await startConnect();
    expect(authorizeUrl.origin).toBe(APP_URL);
    expect(authorizeUrl.pathname).toBe("/auth/devtools");
    expect(authorizeUrl.searchParams.get("public_key")).toBe(PUBLIC_KEY);
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe(CALLBACK_URI);
    expect(authorizeUrl.searchParams.get("code_challenge")).toHaveLength(43);
  });

  it("refuses a start without a widget public key", async () => {
    const response = await handler(
      devtoolsRequest("/connect/start", {
        body: JSON.stringify({ publicKey: "fb_sec_oops" }),
        method: "POST",
      })
    );
    expect(response.status).toBe(400);
  });

  it("exchanges the code with the verifier and stores the token privately", async () => {
    const authorizeUrl = await startConnect();
    const upstream = tokenEndpoint("Acme");
    vi.stubGlobal("fetch", upstream);
    const state = authorizeUrl.searchParams.get("state");

    const response = await handler(
      browserNavigation(`${CALLBACK_URI}?code=one-time&state=${state}`)
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await response.text()).toContain("Connected to Acme");
    const [url, init] = upstream.mock.lastCall ?? [];
    const exchange = JSON.parse(String(init?.body));
    expect(url).toBe(`${API_URL}/api/v1/devtools/token`);
    expect(exchange).toMatchObject({
      code: "one-time",
      redirectUri: CALLBACK_URI,
    });
    expect(
      createHash("sha256").update(exchange.codeVerifier).digest("base64url")
    ).toBe(authorizeUrl.searchParams.get("code_challenge"));
    expect(statSync(connectionsFile).mode.toString(8).slice(-3)).toBe("600");
    expect((await readConnection(sandbox, API_URL))?.token).toBe(DEV_TOKEN);
    expect(await boardStatus()).toEqual({
      kind: "connected",
      organizationName: "Acme",
    });
  });

  it("proxies board calls with the stored token", async () => {
    await connect();
    const upstream = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ items: [] }), { status: 200 })
    );
    vi.stubGlobal("fetch", upstream);
    const response = await handler(
      devtoolsRequest("/proxy/api/v1/feedback/list")
    );
    expect(response.status).toBe(200);
    const headers = new Headers(upstream.mock.lastCall?.[1]?.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${DEV_TOKEN}`);
  });

  it("accepts a state only once", async () => {
    const authorizeUrl = await startConnect();
    vi.stubGlobal("fetch", tokenEndpoint("Acme"));
    const callback = `${CALLBACK_URI}?code=one-time&state=${authorizeUrl.searchParams.get("state")}`;
    expect((await handler(browserNavigation(callback))).status).toBe(200);

    const replay = await handler(browserNavigation(callback));
    expect(replay.status).toBe(400);
    expect(replay.headers.get("content-type")).toContain("text/html");
  });

  it("binds callbacks to the project and origin that started connecting", async () => {
    const authorizeUrl = await startConnect();
    const upstream = tokenEndpoint("Acme");
    vi.stubGlobal("fetch", upstream);
    const callback = `${CALLBACK_URI}?code=one-time&state=${authorizeUrl.searchParams.get("state")}`;
    const otherProject = createDevtoolsHandler(
      { root: join(sandbox, "another-project") },
      { REFLET_API_URL: API_URL }
    );
    expect((await otherProject(browserNavigation(callback))).status).toBe(400);
    expect(
      (await handler(browserNavigation(callback.replace(":3000", ":3001"))))
        .status
    ).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
    expect((await handler(browserNavigation(callback))).status).toBe(200);
  });

  it("refuses the callback on a host that is not the dev server", async () => {
    const response = await handler(
      browserNavigation(
        `http://evil.example${DEVTOOLS_ROUTE_BASE}/connect/callback?code=a&state=b`
      )
    );
    expect(response.status).toBe(403);
  });

  it("escapes the organization name in the callback page", async () => {
    const response = await connect("<img src=x onerror=alert(1)>");
    const html = await response.text();
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("forgets a stored token that Reflet rejects", async () => {
    await connect();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 401,
          })
      )
    );
    const response = await handler(
      devtoolsRequest("/proxy/api/v1/feedback/list")
    );
    expect(response.status).toBe(401);
    expect(await readConnection(sandbox, API_URL)).toBeNull();
    expect((await boardStatus()).kind).toBe("disconnected");
  });

  it("revokes the token on Reflet when disconnecting", async () => {
    await connect();
    const revoke = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ revoked: true }), { status: 200 })
    );
    vi.stubGlobal("fetch", revoke);

    const response = await handler(
      devtoolsRequest("/connect/disconnect", { body: "{}", method: "POST" })
    );

    expect(await response.json()).toEqual({ revoked: true });
    const [url, init] = revoke.mock.lastCall ?? [];
    expect(url).toBe(`${API_URL}/api/v1/devtools/revoke`);
    expect(new Headers(init?.headers).get("authorization")).toBe(
      `Bearer ${DEV_TOKEN}`
    );
    expect(await readConnection(sandbox, API_URL)).toBeNull();
  });
});
