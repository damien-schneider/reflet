/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules, registerStripeComponent } from "../../test.helpers";

const createCtx = () => {
  const t = convexTest(schema, modules);
  registerStripeComponent(t);
  return t;
};

const createOrgWithoutSubscription = async (t: ReturnType<typeof createCtx>) =>
  t.run((ctx) =>
    ctx.db.insert("organizations", {
      name: "Free Tier Org",
      slug: `free-tier-${Date.now()}`,
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    })
  );

describe("getEffectiveTier", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns 'free' when org has no Stripe customer id", async () => {
    const t = createCtx();
    const organizationId = await createOrgWithoutSubscription(t);

    const result = await t.query(internal.autopilot.billing_gate.checkAccess, {
      organizationId,
    });

    expect(result.tier).toBe("free");
    expect(result.allowed).toBe(false);
  });

  test("returns 'pro' regardless of subscription when AUTOPILOT_E2E_BYPASS=1", async () => {
    vi.stubEnv("AUTOPILOT_E2E_BYPASS", "1");

    const t = createCtx();
    const organizationId = await createOrgWithoutSubscription(t);

    const result = await t.query(internal.autopilot.billing_gate.checkAccess, {
      organizationId,
    });

    expect(result.tier).toBe("pro");
    expect(result.allowed).toBe(true);
  });

  test("does not bypass when AUTOPILOT_E2E_BYPASS is unset", async () => {
    vi.stubEnv("AUTOPILOT_E2E_BYPASS", "");

    const t = createCtx();
    const organizationId = await createOrgWithoutSubscription(t);

    const result = await t.query(internal.autopilot.billing_gate.checkAccess, {
      organizationId,
    });

    expect(result.tier).toBe("free");
  });

  test("does not bypass when AUTOPILOT_E2E_BYPASS is set to a non-'1' value", async () => {
    vi.stubEnv("AUTOPILOT_E2E_BYPASS", "true");

    const t = createCtx();
    const organizationId = await createOrgWithoutSubscription(t);

    const result = await t.query(internal.autopilot.billing_gate.checkAccess, {
      organizationId,
    });

    expect(result.tier).toBe("free");
  });
});
