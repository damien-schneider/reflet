/// <reference types="vite/client" />
import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../_generated/api";
import { PLATFORM_ADMIN_ISSUER } from "../../shared/platform_admin";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const SUPER_ADMIN = { _id: "user_super", email: "ops@reflet.test" };
const CUSTOMER_OWNER = {
  _id: "user_owner",
  email: "owner@customer.test",
  name: "Paying Owner",
};
const PLATFORM_ADMIN_LOGIN = "damien-schneider";

const setup = async () => {
  vi.stubEnv("SUPER_ADMIN_EMAILS", SUPER_ADMIN.email);
  const t = setupTest({
    authUsers: [SUPER_ADMIN, CUSTOMER_OWNER],
    stripeSubscriptionStatus: "active",
  });
  await t.run(async (ctx) => {
    const now = Date.now();
    const organizationId = await seedOrganization(ctx, {
      customDomain: "feedback.customer.test",
      stripeCustomerId: "cus_paying",
      subscriptionStatus: "active",
      subscriptionTier: "pro",
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: now,
      organizationId,
      role: "owner",
      userId: CUSTOMER_OWNER._id,
    });
    const feedbackId = await seedFeedback(ctx, organizationId, {
      voteCount: 1,
    });
    await ctx.db.insert("feedbackVotes", {
      createdAt: now,
      feedbackId,
      userId: CUSTOMER_OWNER._id,
      voteType: "upvote",
    });
    await ctx.db.insert("comments", {
      authorId: CUSTOMER_OWNER._id,
      body: "Same here",
      createdAt: now,
      feedbackId,
      isOfficial: false,
      updatedAt: now,
    });
    await ctx.db.insert("activityLogs", {
      action: "feedback_created",
      authorId: CUSTOMER_OWNER._id,
      createdAt: now,
      details: "Draft lost on save",
      organizationId,
    });
    await seedOrganization(ctx, { slug: "free-org" });
  });
  return t;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

test("a platform admin token reads every super-admin view without a Better Auth user", async () => {
  const t = await setup();
  const platformAdmin = t.withIdentity({
    issuer: PLATFORM_ADMIN_ISSUER,
    subject: PLATFORM_ADMIN_LOGIN,
  });
  const { super_admin, super_admin_customers, super_admin_metrics } =
    api.organizations;

  const [customers, stats, users, organizations, revenue] = await Promise.all([
    platformAdmin.query(super_admin_customers.listCustomers, {}),
    platformAdmin.query(super_admin.getDashboardStats, {}),
    platformAdmin.query(super_admin.listUsers, {}),
    platformAdmin.query(super_admin.listOrganizations, {
      paginationOpts: { cursor: null, numItems: 10 },
    }),
    platformAdmin.query(super_admin_metrics.getRevenueSummary, {}),
    platformAdmin.query(super_admin_metrics.getTopVotedFeedback, {}),
    platformAdmin.query(super_admin_metrics.getRecentActivity, {}),
    platformAdmin.query(super_admin_metrics.getTrends, { days: 7 }),
  ]);

  expect(await platformAdmin.query(super_admin.isSuperAdmin, {})).toBe(true);
  expect(customers).toMatchObject([
    {
      owner: { email: CUSTOMER_OWNER.email, name: CUSTOMER_OWNER.name },
      subscription: { lastPaidInvoice: null, status: "active" },
      usage: { feedback: 1, members: 1 },
    },
  ]);
  expect(stats).toEqual({
    activeProSubscriptions: 1,
    totalComments: 1,
    totalFeedback: 1,
    totalOrganizations: 2,
    totalUsers: 1,
    totalVotes: 1,
  });
  expect(users.items.map((user) => user.email)).toEqual([CUSTOMER_OWNER.email]);
  expect(organizations.page).toHaveLength(2);
  expect(revenue).toMatchObject({ freeCount: 1, proCount: 1 });
});

test("a token from another issuer without a session is not a super admin", async () => {
  const t = await setup();
  const stranger = t.withIdentity({
    issuer: "https://impostor.example",
    subject: PLATFORM_ADMIN_LOGIN,
  });

  await expect(
    stranger.query(api.organizations.super_admin.getDashboardStats, {})
  ).rejects.toThrow("Not authorized");
  expect(
    await stranger.query(api.organizations.super_admin.isSuperAdmin, {})
  ).toBe(false);
});

test("a signed-in user listed in SUPER_ADMIN_EMAILS stays a super admin, others do not", async () => {
  const t = await setup();
  const signedInAs = (userId: string) =>
    t.withIdentity({ sessionId: userId, subject: userId });

  expect(
    await signedInAs(SUPER_ADMIN._id).query(
      api.organizations.super_admin.getDashboardStats,
      {}
    )
  ).toMatchObject({ totalOrganizations: 2 });
  await expect(
    signedInAs(CUSTOMER_OWNER._id).query(
      api.organizations.super_admin.getDashboardStats,
      {}
    )
  ).rejects.toThrow("Not authorized");
});
