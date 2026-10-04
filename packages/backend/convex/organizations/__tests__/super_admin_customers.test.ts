/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import { PLATFORM_ADMIN_ISSUER } from "../../shared/platform_admin";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
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
  return { as, payingOrgId, platformAdmin, t };
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

test("a customer's latest cancellation travels with its Stripe reason", async () => {
  const { payingOrgId, platformAdmin, t } = await setup();
  await t.run(async (ctx) => {
    await ctx.db.insert("subscriptionCancellations", {
      organizationId: payingOrgId,
      reason: "cancellation_requested",
      requestedAt: 1,
      resumedAt: 2,
      stripeSubscriptionId: "sub_test",
    });
    await ctx.db.insert("subscriptionCancellations", {
      comment: "Switching to Canny",
      feedback: "switched_service",
      organizationId: payingOrgId,
      reason: "cancellation_requested",
      requestedAt: 3,
      stripeSubscriptionId: "sub_test",
    });
  });

  const [customer] = await platformAdmin.query(
    api.organizations.super_admin_customers.listCustomers,
    {}
  );

  expect(customer?.latestCancellation).toEqual({
    comment: "Switching to Canny",
    feedback: "switched_service",
    reason: "cancellation_requested",
    requestedAt: 3,
  });
});

test("customer health counts only the last day of triage failures and API errors", async () => {
  const { payingOrgId, platformAdmin, t } = await setup();
  const now = Date.now();
  const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
  await t.run(async (ctx) => {
    const feedbackId = await seedFeedback(ctx, payingOrgId);
    const triageRun = {
      applyModeration: false,
      criteriaVersion: "test",
      feedbackId,
      input: { description: "Broken", title: "Checkout" },
      inputVersion: "test",
      model: "test",
      organizationId: payingOrgId,
      questions: [],
      startedAt: now,
      tags: [],
      thresholds: { clarification: 0, junk: 0, maxTags: 0, tag: 0 },
    };
    await ctx.db.insert("feedbackTriageRuns", {
      ...triageRun,
      completedAt: now,
      error: "OPENROUTER_API_KEY is not set",
      status: "failed",
    });
    await ctx.db.insert("feedbackTriageRuns", {
      ...triageRun,
      completedAt: twoDaysAgo,
      error: "OPENROUTER_API_KEY is not set",
      status: "failed",
    });
    await ctx.db.insert("feedbackTriageRuns", {
      ...triageRun,
      completedAt: now,
      status: "completed",
    });
    await ctx.db.insert("organizationApiKeys", {
      createdAt: twoDaysAgo,
      isActive: true,
      lastUsedAt: now,
      name: "Widget",
      organizationId: payingOrgId,
      publicKey: "fb_pub_health",
      secretKeyHash: "c".repeat(64),
    });
    await ctx.db.insert("apiRequestLogs", {
      endpoint: "/api/v1/feedback/create",
      method: "POST",
      organizationId: payingOrgId,
      statusCode: 500,
      timestamp: now,
    });
    await ctx.db.insert("apiRequestLogs", {
      endpoint: "/api/v1/feedback/create",
      method: "POST",
      organizationId: payingOrgId,
      statusCode: 500,
      timestamp: twoDaysAgo,
    });
  });

  const [customer] = await platformAdmin.query(
    api.organizations.super_admin_customers.listCustomers,
    {}
  );

  expect(customer?.usage).toMatchObject({
    apiErrorsLast24h: 1,
    lastApiRequestAt: now,
    triageFailuresLast24h: 1,
  });
});

test("customer engagement reads the newest member session and the last 30 days of feedback", async () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const t = setupTest({
    authUsers: [
      { ...CUSTOMER_OWNER, sessionsUpdatedAt: [now - 40 * DAY_MS] },
      {
        _id: "user_teammate",
        email: "teammate@customer.test",
        sessionsUpdatedAt: [now - 9 * DAY_MS, now - 3 * DAY_MS],
      },
    ],
    stripeSubscriptionStatus: "active",
  });
  await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.patch(organizationId, { stripeCustomerId: "cus_paying" });
    for (const userId of [CUSTOMER_OWNER._id, "user_teammate"]) {
      await ctx.db.insert("organizationMembers", {
        createdAt: now,
        organizationId,
        role: userId === CUSTOMER_OWNER._id ? "owner" : "member",
        userId,
      });
    }
    await seedFeedback(ctx, organizationId, { createdAt: now - 2 * DAY_MS });
    await seedFeedback(ctx, organizationId, { createdAt: now - 45 * DAY_MS });
  });

  const [customer] = await t
    .withIdentity({
      issuer: PLATFORM_ADMIN_ISSUER,
      subject: "damien-schneider",
    })
    .query(api.organizations.super_admin_customers.listCustomers, {});

  expect(customer?.usage).toMatchObject({
    feedback: 2,
    feedbackLast30Days: 1,
    lastFeedbackAt: now - 2 * DAY_MS,
    lastTeamSeenAt: now - 3 * DAY_MS,
  });
});
