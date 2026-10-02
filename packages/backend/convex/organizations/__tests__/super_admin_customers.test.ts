/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import { PLATFORM_ADMIN_ISSUER } from "../../shared/platform_admin";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const CUSTOMER_OWNER = {
  _id: "user_owner",
  email: "owner@customer.test",
  name: "Paying Owner",
};

const setup = async () => {
  const t = setupTest({
    authUsers: [CUSTOMER_OWNER],
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
  const platformAdmin = t.withIdentity({
    issuer: PLATFORM_ADMIN_ISSUER,
    subject: "damien-schneider",
  });
  return { as, payingOrgId, platformAdmin };
};

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
  const { payingOrgId, platformAdmin } = await setup();
  const customers = await platformAdmin.query(
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
