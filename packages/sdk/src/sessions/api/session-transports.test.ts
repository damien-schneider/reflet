import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { SessionApiError } from "./session-api";
import { devtoolsTransport, teamTransport } from "./session-transports";

const okSchema = z.object({ ok: z.boolean() });

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("teamTransport", () => {
  it("posts JSON with the team bearer token", async () => {
    const fetchMock = stubFetch(200, { ok: true });
    const transport = teamTransport({
      apiUrl: "https://api.reflet.test/",
      token: "fb_team_abc",
    });
    const result = await transport.request({
      body: { sessionId: "s1" },
      method: "POST",
      path: "/api/v1/sessions/analyze",
      schema: okSchema,
    });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.reflet.test/api/v1/sessions/analyze");
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer fb_team_abc");
    expect(headers.get("content-type")).toBe("application/json");
    expect(init?.body).toBe(JSON.stringify({ sessionId: "s1" }));
  });

  it("sends GET queries without a body", async () => {
    const fetchMock = stubFetch(200, { ok: true });
    await teamTransport({ apiUrl: "https://api.test", token: "t" }).request({
      method: "GET",
      path: "/api/v1/sessions/detail",
      query: { sessionId: "s 1" },
      schema: okSchema,
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.test/api/v1/sessions/detail?sessionId=s+1");
    expect(init?.body).toBeUndefined();
  });

  it("turns an error body into a SessionApiError with its limit", async () => {
    stubFetch(413, { error: "Too long", limit: "duration" });
    const request = teamTransport({
      apiUrl: "https://api.test",
      token: "t",
    }).request({
      body: {},
      method: "POST",
      path: "/api/v1/sessions/events",
      schema: okSchema,
    });
    await expect(request).rejects.toMatchObject({
      limit: "duration",
      message: "Too long",
      status: 413,
    });
    await expect(request).rejects.toBeInstanceOf(SessionApiError);
  });
});

describe("devtoolsTransport", () => {
  it("goes through the dev route proxy", async () => {
    const fetchMock = stubFetch(200, { ok: true });
    await devtoolsTransport().request({
      method: "GET",
      path: "/api/v1/sessions/list",
      schema: okSchema,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/reflet-devtools/proxy/api/v1/sessions/list"
    );
  });

  it("keeps the status and limit of a proxied error", async () => {
    stubFetch(413, { error: "Too many events", limit: "events" });
    const request = devtoolsTransport().request({
      body: { sessionId: "s1" },
      method: "POST",
      path: "/api/v1/sessions/events",
      schema: okSchema,
    });
    await expect(request).rejects.toMatchObject({
      limit: "events",
      message: "Too many events",
      status: 413,
    });
  });
});
