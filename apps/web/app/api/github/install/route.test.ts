import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("../connect-flow", () => ({
  redirectToAppInstallation: vi.fn(() =>
    Promise.resolve(new Response(null, { status: 307 }))
  ),
  requestUserAuthorization: vi.fn(() =>
    Promise.resolve(new Response(null, { status: 307 }))
  ),
}));

function install(secFetchSite?: string) {
  return GET(
    new Request("https://www.reflet.app/api/github/install?orgSlug=acme", {
      headers: secFetchSite ? { "sec-fetch-site": secFetchSite } : {},
    })
  );
}

describe("GET /api/github/install", () => {
  it("starts the flow only from a same-origin navigation", async () => {
    expect((await install("same-origin")).status).toBe(307);
  });

  it.each(["cross-site", "same-site", "none", undefined])(
    "refuses sec-fetch-site %s",
    async (secFetchSite) => {
      expect((await install(secFetchSite)).status).toBe(403);
    }
  );
});
