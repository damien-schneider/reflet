/// <reference types="vite/client" />
import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const PLATFORM_ADMIN = { _id: "user_platform", email: "ops@reflet.test" };
const CUSTOMER_OWNER = {
  _id: "user_owner",
  email: "owner@customer.test",
  name: "Paying Owner",
};

const setup = async () => {
  vi.stubEnv("SUPER_ADMIN_EMAILS", PLATFORM_ADMIN.email);
  const t = setupTest({
    authUsers: [PLATFORM_ADMIN, CUSTOMER_OWNER],
    stripeSubscriptionStatus: "active",
  });
  const payingOrgId = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.patch(organizationId, { stripeCustomerId: "cus_paying" });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "owner",
      userId: CUSTOMER_OWNER._id,
    });
    await seedOrganization(ctx);
    return organizationId;
  });
  const as = (userId: string) =>
    t.withIdentity({ sessionId: userId, subject: userId });
  return { as, payingOrgId };
};

afterEach(() => {
  vi.unstubAllEnvs();
});

test("an org owner cannot list platform customers", async () => {
  const { as } = await setup();
  await expect(
    as(CUSTOMER_OWNER._id).query(
      api.organizations.super_admin_customers.listCustomers,
      {}
    )
  ).rejects.toThrow("Not authorized");
});

test("customers are the orgs that reached Stripe, with their owner and live status", async () => {
  const { as, payingOrgId } = await setup();
  const customers = await as(PLATFORM_ADMIN._id).query(
    api.organizations.super_admin_customers.listCustomers,
    {}
  );

  expect(customers).toHaveLength(1);
  expect(customers[0]).toMatchObject({
    _id: payingOrgId,
    owner: { email: CUSTOMER_OWNER.email, name: CUSTOMER_OWNER.name },
    stripeCustomerId: "cus_paying",
    subscription: { status: "active" },
    usage: { members: 1 },
  });
});
