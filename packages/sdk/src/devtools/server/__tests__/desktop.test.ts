// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeEach,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { createTeamToolsHost } from "../desktop";

const API_URL = "https://api.reflet.test";
const APP_URL = "https://app.reflet.test";
const PUBLIC_KEY = "fb_pub_widget";
const DEV_TOKEN = "fb_dev_desktop_token";

const sandbox = mkdtempSync(join(tmpdir(), "reflet-desktop-host-"));
const loopbackFetch = globalThis.fetch;

vi.mock("node:os", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:os")>()),
  homedir: () => sandbox,
}));

const reflet = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

function createHost() {
  const openExternal = vi.fn(async (_url: string) => undefined);
  const host = createTeamToolsHost({
    apiUrl: API_URL,
    appDataDirectory: join(sandbox, "app-data"),
    appUrl: APP_URL,
    openExternal,
    publicKey: PUBLIC_KEY,
  });
  return { host, openExternal };
}

async function openedSignIn(
  openExternal: Mock<(url: string) => Promise<undefined>>
): Promise<URL> {
  return await vi.waitFor(() => {
    const opened = openExternal.mock.calls.at(-1)?.[0];
    if (opened === undefined) {
      throw new Error("Sign-in has not opened the browser yet.");
    }
    return new URL(opened);
  });
}

function callbackFor(authorizeUrl: URL, params: Record<string, string>) {
  const callback = new URL(authorizeUrl.searchParams.get("redirect_uri") ?? "");
  for (const [name, value] of Object.entries(params)) {
    callback.searchParams.set(name, value);
  }
  return callback;
}

async function signedInHost() {
  const { host, openExternal } = createHost();
  const signingIn = host.signIn();
  const authorizeUrl = await openedSignIn(openExternal);
  await loopbackFetch(
    callbackFor(authorizeUrl, {
      code: "one-time",
      state: authorizeUrl.searchParams.get("state") ?? "",
    })
  );
  await signingIn;
  return host;
}

beforeEach(() => {
  rmSync(join(sandbox, ".reflet"), { force: true, recursive: true });
  reflet.mockImplementation(async () =>
    Response.json({ organizationName: "Acme", token: DEV_TOKEN })
  );
  vi.stubGlobal("fetch", (url: string | URL, init?: RequestInit) =>
    String(url).startsWith(API_URL)
      ? reflet(String(url), init)
      : loopbackFetch(url, init)
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  reflet.mockReset();
});

afterAll(() => {
  rmSync(sandbox, { force: true, recursive: true });
});

it("signs in through the system browser back to a loopback callback", async () => {
  const { host, openExternal } = createHost();
  expect(await host.account()).toBeNull();

  const signingIn = host.signIn();
  const authorizeUrl = await openedSignIn(openExternal);
  const redirectUri = authorizeUrl.searchParams.get("redirect_uri") ?? "";
  expect(authorizeUrl.origin + authorizeUrl.pathname).toBe(
    `${APP_URL}/auth/devtools`
  );
  expect(authorizeUrl.searchParams.get("public_key")).toBe(PUBLIC_KEY);
  expect(authorizeUrl.searchParams.get("client")).toBe("desktop");
  expect(new URL(redirectUri).hostname).toBe("127.0.0.1");

  const callback = await loopbackFetch(
    callbackFor(authorizeUrl, {
      code: "one-time",
      state: authorizeUrl.searchParams.get("state") ?? "",
    })
  );

  expect(callback.status).toBe(200);
  expect(await signingIn).toEqual({ organizationName: "Acme" });
  expect(await host.account()).toEqual({ organizationName: "Acme" });
  expect(JSON.parse(String(reflet.mock.calls[0]?.[1]?.body))).toMatchObject({
    code: "one-time",
    redirectUri,
  });
});

it("ignores callbacks that do not carry this sign-in's state", async () => {
  const { host, openExternal } = createHost();
  let settled = false;
  host.signIn().finally(() => {
    settled = true;
  });
  const authorizeUrl = await openedSignIn(openExternal);

  const stray = await loopbackFetch(
    callbackFor(authorizeUrl, { code: "stolen", state: "guessed" })
  );

  expect(stray.status).toBe(404);
  expect(reflet).not.toHaveBeenCalled();
  expect(settled).toBe(false);
  await loopbackFetch(
    callbackFor(authorizeUrl, {
      code: "one-time",
      state: authorizeUrl.searchParams.get("state") ?? "",
    })
  );
  await vi.waitFor(() => expect(settled).toBe(true));
});

it("reopens the same sign-in instead of starting a second one", async () => {
  const { host, openExternal } = createHost();
  const first = host.signIn();
  const firstUrl = await openedSignIn(openExternal);
  const second = host.signIn();
  await vi.waitFor(() => expect(openExternal).toHaveBeenCalledTimes(2));

  expect(String(openExternal.mock.calls[1]?.[0])).toBe(firstUrl.href);
  await loopbackFetch(
    callbackFor(firstUrl, {
      code: "one-time",
      state: firstUrl.searchParams.get("state") ?? "",
    })
  );
  expect(await Promise.all([first, second])).toEqual([
    { organizationName: "Acme" },
    { organizationName: "Acme" },
  ]);
});

it("forwards session calls with the stored token and nothing else", async () => {
  const host = await signedInHost();
  reflet.mockImplementation(async () => Response.json({ sessions: [] }));

  const reply = await host.request({
    method: "GET",
    path: "/api/v1/sessions/list",
    query: { cursor: "c 1" },
  });
  const refused = await host.request({ method: "GET", path: "/api/v1/admin" });

  expect(reply).toEqual({ body: '{"sessions":[]}', status: 200 });
  expect(reflet).toHaveBeenLastCalledWith(
    `${API_URL}/api/v1/sessions/list?cursor=c+1`,
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: `Bearer ${DEV_TOKEN}`,
      }),
    })
  );
  expect(refused.status).toBe(404);
  expect(reflet).toHaveBeenCalledTimes(2);
});

it("signs out when Reflet refuses the token", async () => {
  const host = await signedInHost();
  reflet.mockImplementation(async () =>
    Response.json(
      { error: "Invalid or expired devtools token." },
      { status: 401 }
    )
  );

  const reply = await host.request({
    method: "GET",
    path: "/api/v1/sessions/list",
  });

  expect(reply.status).toBe(401);
  expect(await host.account()).toBeNull();
});
