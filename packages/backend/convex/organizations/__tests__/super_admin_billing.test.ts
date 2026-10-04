/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import { PLATFORM_ADMIN_ISSUER } from "../../shared/platform_admin";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const OWNER = { _id: "user_owner", email: "owner@customer.test" };

const setup = async (stripeSubscriptionStatus: string | null = null) => {
  const t = setupTest({ authUsers: [OWNER], stripeSubscriptionStatus });
  const organizationId = await t.run(async (ctx) => {
    const id = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: id,
      role: "owner",
      userId: OWNER._id,
    });
    return id;
  });
  const platformAdmin = t.withIdentity({
    issuer: PLATFORM_ADMIN_ISSUER,
    subject: "damien-schneider",
  });
  const owner = t.withIdentity({ sessionId: OWNER._id, subject: OWNER._id });
  return { organizationId, owner, platformAdmin };
};

const billing = api.organizations.super_admin_billing;

test("an org owner cannot grant, sync or cancel billing through the platform admin actions", async () => {
  const { organizationId, owner } = await setup("active");

  await expect(
    owner.action(billing.grantProTrial, { days: 30, organizationId })
  ).rejects.toThrow("Not authorized");
  await expect(
    owner.action(billing.syncFromStripe, { organizationId })
  ).rejects.toThrow("Not authorized");
  await expect(
    owner.action(billing.cancelSubscription, { organizationId })
  ).rejects.toThrow("Not authorized");
  await expect(
    owner.action(billing.grantFreeMonths, { months: 1, organizationId })
  ).rejects.toThrow("Not authorized");
});

test.each([0, 1.5, 13])(
  "%d free months are refused before reaching Stripe",
  async (months) => {
    const { organizationId, platformAdmin } = await setup("active");

    await expect(
      platformAdmin.action(billing.grantFreeMonths, { months, organizationId })
    ).rejects.toMatchObject({ data: { code: "INVALID_MONTHS" } });
  }
);

test.each([
  [null, "NO_SUBSCRIPTION"],
  ["canceled", "NO_SUBSCRIPTION"],
  ["trialing", "TRIALING"],
  ["active", "NOT_MONTHLY"],
])(
  "free months on a %s subscription are refused with %s",
  async (status, code) => {
    const { organizationId, platformAdmin } = await setup(status);

    await expect(
      platformAdmin.action(billing.grantFreeMonths, {
        months: 2,
        organizationId,
      })
    ).rejects.toMatchObject({ data: { code } });
  }
);

test.each([0, 2.5, 366])(
  "a %d-day trial is refused before reaching Stripe",
  async (days) => {
    const { organizationId, platformAdmin } = await setup();

    await expect(
      platformAdmin.action(billing.grantProTrial, { days, organizationId })
    ).rejects.toMatchObject({ data: { code: "INVALID_DAYS" } });
  }
);

test.each(["active", "past_due"])(
  "an org with a %s subscription cannot be put on a free trial",
  async (status) => {
    const { organizationId, platformAdmin } = await setup(status);

    await expect(
      platformAdmin.action(billing.grantProTrial, { days: 30, organizationId })
    ).rejects.toMatchObject({ data: { code: "ALREADY_SUBSCRIBED" } });
  }
);

test("an org that never reached Stripe has nothing to sync or cancel", async () => {
  const { organizationId, platformAdmin } = await setup();

  await expect(
    platformAdmin.action(billing.syncFromStripe, { organizationId })
  ).rejects.toMatchObject({ data: { code: "NO_SUBSCRIPTION" } });
  await expect(
    platformAdmin.action(billing.cancelSubscription, { organizationId })
  ).rejects.toMatchObject({ data: { code: "NO_SUBSCRIPTION" } });
});
