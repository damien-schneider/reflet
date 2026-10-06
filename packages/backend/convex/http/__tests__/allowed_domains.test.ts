/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import { isRequestFromAllowedDomain } from "../public_api/allowed_domains";

const PUBLIC_KEY = "fb_pub_locked";

const requestFrom = (headers: Record<string, string>) =>
  new Request("https://api.reflet.test/api/v1/feedback/list", { headers });

describe("isRequestFromAllowedDomain", () => {
  test("matches the Origin host exactly, case-insensitively", () => {
    const request = requestFrom({ Origin: "https://App.Acme.com" });

    expect(isRequestFromAllowedDomain(request, ["app.acme.com"])).toBe(true);
    expect(isRequestFromAllowedDomain(request, ["acme.com"])).toBe(false);
    expect(isRequestFromAllowedDomain(request, ["app.acme.com:3000"])).toBe(
      false
    );
  });

  test("a wildcard covers subdomains only", () => {
    expect(
      isRequestFromAllowedDomain(
        requestFrom({ Origin: "https://docs.acme.com" }),
        ["*.acme.com"]
      )
    ).toBe(true);
    expect(
      isRequestFromAllowedDomain(requestFrom({ Origin: "https://acme.com" }), [
        "*.acme.com",
      ])
    ).toBe(false);
    expect(
      isRequestFromAllowedDomain(
        requestFrom({ Origin: "https://acme.com.evil.test" }),
        ["*.acme.com"]
      )
    ).toBe(false);
  });

  test("falls back to the Referer host and rejects a request with neither", () => {
    expect(
      isRequestFromAllowedDomain(
        requestFrom({ Referer: "https://app.acme.com/settings?x=1" }),
        ["app.acme.com"]
      )
    ).toBe(true);
    expect(isRequestFromAllowedDomain(requestFrom({}), ["app.acme.com"])).toBe(
      false
    );
    expect(isRequestFromAllowedDomain(requestFrom({}), [])).toBe(true);
  });
});

describe("publishable key allowed domains", () => {
  test("a locked publishable key only works from its allowed origins", async () => {
    const t = setupTest();
    await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      await ctx.db.insert("organizationApiKeys", {
        allowedDomains: ["app.acme.com"],
        createdAt: Date.now(),
        isActive: true,
        name: "Widget",
        organizationId,
        publicKey: PUBLIC_KEY,
        secretKeyHash: "c".repeat(64),
      });
    });
    const list = (origin?: string) =>
      t.fetch("/api/v1/feedback/list", {
        headers: {
          Authorization: `Bearer ${PUBLIC_KEY}`,
          ...(origin ? { Origin: origin } : {}),
        },
      });

    expect((await list("https://evil.test")).status).toBe(403);
    expect((await list()).status).toBe(403);
    expect((await list("https://app.acme.com")).status).toBe(200);
  });
});
