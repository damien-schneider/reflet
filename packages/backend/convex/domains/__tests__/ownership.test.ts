/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../_generated/api";
import { setupTest } from "../../test.helpers";

const DOMAIN = "feedback.example.com";
const TOKEN = "a".repeat(64);
const HEX_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

const stubDns = (txtValues: string[]) => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: URL | string) => {
      const url = String(input);
      if (url.startsWith("https://cloudflare-dns.com/")) {
        return Promise.resolve(
          Response.json({
            Answer: txtValues.map((value) => ({
              data: `"${value}"`,
              type: 16,
            })),
          })
        );
      }
      if (url.includes("/config")) {
        return Promise.resolve(Response.json({ misconfigured: false }));
      }
      return Promise.resolve(Response.json({ name: DOMAIN, verified: true }));
    })
  );
};

const setupPendingOrg = async (token?: string) => {
  const t = setupTest();
  const organizationId = await t.run((ctx) =>
    ctx.db.insert("organizations", {
      createdAt: Date.now(),
      customDomain: DOMAIN,
      customDomainChallengeToken: token,
      customDomainStatus: "pending_verification",
      isPublic: true,
      name: "Org",
      slug: "org",
      subscriptionStatus: "active",
      subscriptionTier: "pro",
    })
  );
  await t.action(internal.domains.actions.verifyDomainAction, {
    domain: DOMAIN,
    organizationId,
  });
  return t.run((ctx) => ctx.db.get(organizationId));
};

describe("custom domain ownership", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_API_TOKEN", "token");
    vi.stubEnv("VERCEL_PROJECT_ID", "project");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test("stays pending when Vercel verifies but the TXT challenge is missing", async () => {
    stubDns(["someone-else"]);
    const org = await setupPendingOrg(TOKEN);
    expect(org?.customDomainStatus).toBe("pending_verification");
  });

  test("activates when the TXT challenge matches the org token", async () => {
    stubDns([TOKEN]);
    const org = await setupPendingOrg(TOKEN);
    expect(org?.customDomainStatus).toBe("active");
  });

  test("a pending domain without a token gets one and cannot activate without TXT", async () => {
    stubDns([]);
    const org = await setupPendingOrg();
    expect(org?.customDomainStatus).toBe("pending_verification");
    expect(org?.customDomainChallengeToken).toMatch(HEX_TOKEN_PATTERN);
  });
});
