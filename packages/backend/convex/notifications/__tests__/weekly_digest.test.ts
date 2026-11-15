/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { setupTest, type TestContext } from "../../test.helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

const DAY_MS = 24 * 60 * 60 * 1000;
const OWNER = { _id: "user_owner", email: "owner@acme.dev" };
const MEMBER = { _id: "user_member", email: "member@acme.dev" };
const SITE_URL = "https://reflet.test";
const ORG_DIGEST = "notifications/weekly_digest:sendOrganizationDigest";
const DIGEST_EMAIL = "email/renderer:sendWeeklyDigestEmail";

const addMember = (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: string
) =>
  ctx.db.insert("organizationMembers", {
    createdAt: Date.now(),
    organizationId,
    role: "member",
    userId,
  });

const vote = (
  ctx: MutationCtx,
  feedbackId: Id<"feedback">,
  createdAt: number
) =>
  ctx.db.insert("feedbackVotes", {
    createdAt,
    feedbackId,
    userId: `voter_${createdAt}`,
    voteType: "upvote",
  });

const scheduledArgs = async (t: TestContext, name: string) => {
  const jobs = await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect()
  );
  return jobs.filter((job) => job.name === name).map((job) => job.args[0]);
};

const seedActiveOrganization = async (t: TestContext) =>
  await t.run(async (ctx) => {
    const now = Date.now();
    const organizationId = await seedOrganization(ctx);
    await addMember(ctx, organizationId, OWNER._id);
    await addMember(ctx, organizationId, MEMBER._id);
    const popular = await seedFeedback(ctx, organizationId, {
      createdAt: now - 30 * DAY_MS,
      title: "Dark mode",
      voteCount: 9,
    });
    const fresh = await seedFeedback(ctx, organizationId, {
      title: "Export freezes",
      voteCount: 2,
    });
    await vote(ctx, popular, now - DAY_MS);
    await vote(ctx, fresh, now - 2 * DAY_MS);
    await vote(ctx, popular, now - 8 * DAY_MS);
    const otherOrganizationId = await seedOrganization(ctx, { slug: "other" });
    const elsewhere = await seedFeedback(ctx, otherOrganizationId);
    await vote(ctx, elsewhere, now - DAY_MS);
    await ctx.db.insert("activityLogs", {
      action: "status_changed",
      authorId: OWNER._id,
      createdAt: now - DAY_MS,
      details: JSON.stringify({ newStatus: "planned", oldStatus: "open" }),
      feedbackId: popular,
      organizationId,
    });
    return { fresh, organizationId, popular };
  });

describe("weekly team digest", () => {
  test("schedules one digest per organization so a failing organization cannot block the others", async () => {
    const t = setupTest();
    const organizationIds = await t.run(async (ctx) => [
      await seedOrganization(ctx),
      await seedOrganization(ctx, { slug: "globex" }),
    ]);

    await t.mutation(internal.notifications.weekly_digest.sendAllDigests, {});

    expect(await scheduledArgs(t, ORG_DIGEST)).toEqual(
      organizationIds.map((organizationId) => ({ organizationId }))
    );
  });

  test("emails every member this week's activity of their organization only", async () => {
    vi.stubEnv("SITE_URL", SITE_URL);
    const t = setupTest({ authUsers: [OWNER, MEMBER] });
    const { fresh, organizationId, popular } = await seedActiveOrganization(t);

    await t.mutation(
      internal.notifications.weekly_digest.sendOrganizationDigest,
      {
        organizationId,
      }
    );

    const digest = {
      dashboardUrl: `${SITE_URL}/dashboard/acme`,
      newFeedbackCount: 1,
      organizationName: "Acme",
      statusChanges: [{ from: "open", title: "Dark mode", to: "planned" }],
      topFeedback: [
        {
          status: "open",
          title: "Dark mode",
          url: `${SITE_URL}/acme/feedback/${popular}`,
          voteCount: 9,
        },
        {
          status: "open",
          title: "Export freezes",
          url: `${SITE_URL}/acme/feedback/${fresh}`,
          voteCount: 2,
        },
      ],
      totalVotes: 2,
      unsubscribeUrl: `${SITE_URL}/dashboard/account?tab=notifications`,
    };
    expect(await scheduledArgs(t, DIGEST_EMAIL)).toEqual([
      { ...digest, to: OWNER.email },
      { ...digest, to: MEMBER.email },
    ]);
  });

  test("skips members whose address is suppressed", async () => {
    const t = setupTest({ authUsers: [OWNER, MEMBER] });
    const { organizationId } = await seedActiveOrganization(t);
    await t.run((ctx) =>
      ctx.db.insert("emailSuppressions", {
        email: MEMBER.email,
        originalEventType: "email.bounced",
        reason: "hard_bounce",
        suppressedAt: Date.now(),
      })
    );

    await t.mutation(
      internal.notifications.weekly_digest.sendOrganizationDigest,
      {
        organizationId,
      }
    );

    const recipients = (await scheduledArgs(t, DIGEST_EMAIL)).map(
      (email) => email.to
    );
    expect(recipients).toEqual([OWNER.email]);
  });

  test("skips members who turned the weekly digest off", async () => {
    const t = setupTest({ authUsers: [OWNER, MEMBER] });
    const { organizationId } = await seedActiveOrganization(t);
    await t
      .withIdentity({ sessionId: MEMBER._id, subject: MEMBER._id })
      .mutation(api.notifications.preferences.updatePreferences, {
        emailOnWeeklyDigest: false,
      });

    await t.mutation(
      internal.notifications.weekly_digest.sendOrganizationDigest,
      { organizationId }
    );

    const recipients = (await scheduledArgs(t, DIGEST_EMAIL)).map(
      (email) => email.to
    );
    expect(recipients).toEqual([OWNER.email]);
  });

  test("sends nothing to an organization without activity this week", async () => {
    const t = setupTest({ authUsers: [OWNER] });
    const organizationId = await t.run(async (ctx) => {
      const id = await seedOrganization(ctx);
      await addMember(ctx, id, OWNER._id);
      await seedFeedback(ctx, id, { createdAt: Date.now() - 30 * DAY_MS });
      return id;
    });

    await t.mutation(
      internal.notifications.weekly_digest.sendOrganizationDigest,
      {
        organizationId,
      }
    );

    expect(await scheduledArgs(t, DIGEST_EMAIL)).toEqual([]);
  });
});
