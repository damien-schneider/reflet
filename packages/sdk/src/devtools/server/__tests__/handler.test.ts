// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { DEVTOOLS_REQUEST_HEADER, DEVTOOLS_ROUTE_BASE } from "../../protocol";
import { createDevtoolsHandler } from "../handler";
import { createDevtoolsRoute } from "../next";

const SECRET_KEY = "fb_sec_devtools_test";
const API_URL = "https://api.reflet.test";
const ORIGIN = "http://localhost:3000";

const sandbox = mkdtempSync(join(tmpdir(), "reflet-devtools-handler-"));

function devtoolsRequest(path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  if (!headers.has(DEVTOOLS_REQUEST_HEADER)) {
    headers.set(DEVTOOLS_REQUEST_HEADER, "1");
  }
  return new Request(`${ORIGIN}${DEVTOOLS_ROUTE_BASE}${path}`, {
    ...init,
    headers,
  });
}

beforeAll(() => {
  execFileSync("git", ["init", "--quiet"], { cwd: sandbox });
  mkdirSync(join(sandbox, "src"));
  writeFileSync(
    join(sandbox, "src", "Hero.tsx"),
    "export const Hero = () => (\n  <h1>Ship feedback faster</h1>\n);\n"
  );
});

afterAll(() => {
  rmSync(sandbox, { force: true, recursive: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("request guard", () => {
  const handler = createDevtoolsHandler({ root: sandbox }, {});

  it("rejects requests without the devtools header", async () => {
    const response = await handler(
      new Request(`${ORIGIN}${DEVTOOLS_ROUTE_BASE}/status`)
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toHaveProperty("error");
  });

  it("rejects a devtools header with the wrong value", async () => {
    const response = await handler(
      devtoolsRequest("/status", {
        headers: { [DEVTOOLS_REQUEST_HEADER]: "0" },
      })
    );
    expect(response.status).toBe(403);
  });

  it("rejects cross-site browser requests", async () => {
    const response = await handler(
      devtoolsRequest("/status", {
        headers: { "sec-fetch-site": "cross-site" },
      })
    );
    expect(response.status).toBe(403);
  });

  it("answers same-origin requests", async () => {
    const response = await handler(
      devtoolsRequest("/status", {
        headers: { "sec-fetch-site": "same-origin" },
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a rebound hostname even when it looks same-origin", async () => {
    const response = await handler(
      new Request(`http://evil.test:3000${DEVTOOLS_ROUTE_BASE}/status`, {
        headers: {
          [DEVTOOLS_REQUEST_HEADER]: "1",
          "sec-fetch-site": "same-origin",
        },
      })
    );
    expect(response.status).toBe(403);
  });

  it("answers a dev hostname listed in allowedHosts", async () => {
    const custom = createDevtoolsHandler(
      { allowedHosts: ["app.test"], root: sandbox },
      {}
    );
    const response = await custom(
      new Request(`http://app.test:3000${DEVTOOLS_ROUTE_BASE}/status`, {
        headers: { [DEVTOOLS_REQUEST_HEADER]: "1" },
      })
    );
    expect(response.status).toBe(200);
  });
});

describe("createDevtoolsHandler", () => {
  it("reports the editor and whether a secret key is configured", async () => {
    const handler = createDevtoolsHandler(
      { root: sandbox },
      { REFLET_EDITOR: "cursor", REFLET_SECRET_KEY: SECRET_KEY }
    );
    const response = await handler(devtoolsRequest("/status"));
    expect(await response.json()).toEqual({
      editor: "cursor",
      hasSecretKey: true,
      marker: "reflet-devtools",
    });
  });

  it("finds code by text, including files git does not track yet", async () => {
    const handler = createDevtoolsHandler({ root: sandbox }, {});
    const response = await handler(
      devtoolsRequest("/search?q=Ship%20feedback")
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.matches).toEqual([
      expect.objectContaining({
        line: 2,
        path: "src/Hero.tsx",
        preview: "<h1>Ship feedback faster</h1>",
      }),
    ]);
  });

  it("treats a query that looks like a git option as text to find", async () => {
    const handler = createDevtoolsHandler({ root: sandbox }, {});
    writeFileSync(
      join(sandbox, "src", "Pager.tsx"),
      "const flag = '--open-files-in-pager=probe';\n"
    );
    const response = await handler(
      devtoolsRequest(
        `/search?q=${encodeURIComponent("--open-files-in-pager=probe")}`
      )
    );
    expect(response.status).toBe(200);
    expect((await response.json()).matches).toEqual([
      expect.objectContaining({ line: 1, path: "src/Pager.tsx" }),
    ]);
  });

  it("answers unknown endpoints with a JSON 404", async () => {
    const handler = createDevtoolsHandler({ root: sandbox }, {});
    const response = await handler(devtoolsRequest("/unknown"));
    expect(response.status).toBe(404);
    expect(await response.json()).toHaveProperty("error");
  });
});

describe("Reflet proxy", () => {
  const handler = createDevtoolsHandler(
    { apiUrl: `${API_URL}/`, root: sandbox },
    { REFLET_SECRET_KEY: SECRET_KEY }
  );

  it("refuses API paths outside the allowlist", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const response = await handler(
      devtoolsRequest("/proxy/api/v1/feedback/vote")
    );
    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("asks for a secret key when none is configured", async () => {
    const keyless = createDevtoolsHandler({ root: sandbox }, {});
    const response = await keyless(
      devtoolsRequest("/proxy/api/v1/feedback/list")
    );
    expect(response.status).toBe(503);
  });

  it("creates feedback as internal with the secret key and no browser credentials", async () => {
    const upstream = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ feedbackId: "fb1", isApproved: false }), {
          status: 201,
        })
    );
    vi.stubGlobal("fetch", upstream);

    const response = await handler(
      devtoolsRequest("/proxy/api/v1/feedback/create?source=devtools", {
        body: JSON.stringify({ internal: false, title: "Button overflows" }),
        headers: {
          authorization: "Bearer fb_pub_browser",
          cookie: "session=abc",
          "x-user-token": "token",
        },
        method: "POST",
      })
    );

    const [url, init] = upstream.mock.lastCall ?? [];
    const headers = new Headers(init?.headers);
    expect(url).toBe(`${API_URL}/api/v1/feedback/create?source=devtools`);
    expect(headers.get("authorization")).toBe(`Bearer ${SECRET_KEY}`);
    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("x-user-token")).toBe(false);
    expect(JSON.parse(String(init?.body))).toEqual({
      internal: true,
      title: "Button overflows",
    });
    expect(response.status).toBe(201);
    const text = await response.text();
    expect(text).not.toContain(SECRET_KEY);
    expect(JSON.parse(text)).toEqual({ feedbackId: "fb1", isApproved: false });
  });
});

describe("Next route", () => {
  const route = createDevtoolsRoute({ root: sandbox });

  it("answers with an empty 404 outside next dev", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await route.GET(devtoolsRequest("/status"));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("serves the devtools route under next dev", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await route.GET(devtoolsRequest("/status"));
    expect(response.status).toBe(200);
  });
});
