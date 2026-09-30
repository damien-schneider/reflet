/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { setupTest } from "../../test.helpers";

const OWNER = { _id: "user_owner", email: "owner@example.com" };
const ADMIN = { _id: "user_admin", email: "admin@example.com" };

const setupOrg = async () => {
  const t = setupTest({ authUsers: [OWNER, ADMIN] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", {
      createdAt: Date.now(),
      isPublic: false,
      name: "Billing Org",
      slug: "billing-org",
      subscriptionStatus: "none",
      subscriptionTier: "free",
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: OWNER._id,
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "admin",
      userId: ADMIN._id,
    });
    return orgId;
  });
  const as = (user: typeof OWNER) =>
    t.withIdentity({ sessionId: user._id, subject: user._id });
  return { as, organizationId };
};

describe("createCustomerPortalSession", () => {
  test("rejects non-owner members", async () => {
    const { as, organizationId } = await setupOrg();
    await expect(
      as(ADMIN).action(api.billing.actions.createCustomerPortalSession, {
        organizationId,
        returnUrl: "https://reflet.app/billing",
      })
    ).rejects.toThrow("Only the organization owner can manage billing");
  });

  test("lets the owner past the role check", async () => {
    const { as, organizationId } = await setupOrg();
    await expect(
      as(OWNER).action(api.billing.actions.createCustomerPortalSession, {
        organizationId,
        returnUrl: "https://reflet.app/billing",
      })
    ).rejects.toThrow("No billing account found");
  });
});
