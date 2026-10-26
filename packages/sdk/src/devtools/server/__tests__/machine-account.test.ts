// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  DEVTOOLS_ACCOUNT_HEADER,
  DEVTOOLS_REQUEST_HEADER,
  DEVTOOLS_ROUTE_BASE,
} from "../../protocol";
import { listConnections, saveConnection } from "../connect/connection-store";
import { createDevtoolsHandler } from "../handler";

const ORIGIN = "http://localhost:3000";
const API_URL = "https://api.reflet.test";
const ONE_REC = {
  apiUrl: API_URL,
  organizationName: "One Rec",
  token: "fb_dev_one_rec",
};

const sandbox = mkdtempSync(join(tmpdir(), "reflet-devtools-machine-"));

vi.mock("node:os", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:os")>()),
  homedir: () => sandbox,
}));

const handler = createDevtoolsHandler(
  { root: join(sandbox, "keyless-app") },
  { REFLET_API_URL: API_URL }
);

function devtoolsRequest(path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set(DEVTOOLS_REQUEST_HEADER, "1");
  headers.set("sec-fetch-site", "same-origin");
  return new Request(`${ORIGIN}${DEVTOOLS_ROUTE_BASE}${path}`, {
    ...init,
    headers,
  });
}

async function machineAccounts(): Promise<unknown[]> {
  const status = await (await handler(devtoolsRequest("/status"))).json();
  return status.machineAccounts;
}

async function oneRecId(): Promise<string> {
  const [account] = await machineAccounts();
  if (
    typeof account !== "object" ||
    account === null ||
    !("id" in account) ||
    typeof account.id !== "string"
  ) {
    throw new Error("Expected One Rec among the machine accounts.");
  }
  return account.id;
}

function asAccount(accountId: string, apiPath: string, body?: unknown) {
  return handler(
    devtoolsRequest(`/proxy${apiPath}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { [DEVTOOLS_ACCOUNT_HEADER]: accountId },
      method: body === undefined ? "GET" : "POST",
    })
  );
}

function upstream(status: number) {
  const fetchMock = vi.fn(
    (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({}), { status })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(async () => {
  rmSync(join(sandbox, ".reflet"), { force: true, recursive: true });
  await saveConnection(join(sandbox, "one-rec"), ONE_REC);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  rmSync(sandbox, { force: true, recursive: true });
});

it("lists accounts connected in other apps without their tokens", async () => {
  const response = await handler(devtoolsRequest("/status"));
  const body = await response.text();

  expect(JSON.parse(body).machineAccounts).toEqual([
    { id: expect.any(String), organizationName: "One Rec" },
  ]);
  expect(body).not.toContain(ONE_REC.token);
});

it("records sessions as that account", async () => {
  const fetchMock = upstream(200);

  const response = await asAccount(await oneRecId(), "/api/v1/sessions/list");

  expect(response.status).toBe(200);
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe(`${ONE_REC.apiUrl}/api/v1/sessions/list`);
  expect(new Headers(init?.headers).get("Authorization")).toBe(
    `Bearer ${ONE_REC.token}`
  );
});

it.each(["/api/v1/sessions/proposals/feedback", "/api/v1/feedback/create"])(
  "never publishes to a board as that account: %s",
  async (apiPath) => {
    const fetchMock = upstream(200);

    const response = await asAccount(await oneRecId(), apiPath, {
      proposalId: "proposal_1",
    });

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  }
);

it("refuses an account that is no longer connected", async () => {
  const fetchMock = upstream(200);

  const response = await asAccount("gone", "/api/v1/sessions/list");

  expect(response.status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("never borrows an account from another Reflet API", async () => {
  await saveConnection(join(sandbox, "staging-app"), {
    apiUrl: "https://staging.reflet.test",
    organizationName: "Staging",
    token: "fb_dev_staging",
  });
  const staging = (await listConnections()).find(
    (connection) => connection.organizationName === "Staging"
  );
  if (!staging) {
    throw new Error("Expected the staging connection to be stored.");
  }
  const fetchMock = upstream(200);

  const response = await asAccount(staging.id, "/api/v1/sessions/list");

  expect(await machineAccounts()).toEqual([
    { id: expect.any(String), organizationName: "One Rec" },
  ]);
  expect(response.status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("forgets an account Reflet refuses, in every app that stored it", async () => {
  await saveConnection(join(sandbox, "one-rec-docs"), ONE_REC);
  upstream(401);

  const response = await asAccount(await oneRecId(), "/api/v1/sessions/list");

  expect(response.status).toBe(401);
  expect(await machineAccounts()).toEqual([]);
});
