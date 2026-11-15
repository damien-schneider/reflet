/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

const VOTER = { _id: "user_voter", email: "voter@example.com" };
const SUBSCRIBER = { _id: "user_subscriber", email: "subscriber@example.com" };
const SITE_URL = "https://reflet.test";
const SHIPPED_EMAIL = "email/renderer:sendFeedbackShippedEmail";

const setup = async (stripeSubscriptionStatus: string | null = "active") => {
  const t = setupTest({
    authUsers: [VOTER, SUBSCRIBER],
    stripeSubscriptionStatus,
  });
  const { feedbackId, releaseId } = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx, {
      subscriptionStatus: "active",
      subscriptionTier: "pro",
    });
    const shipped = await seedFeedback(ctx, organizationId, {
      status: "completed",
      title: "Dark mode",
    });
    const deleted = await seedFeedback(ctx, organizationId, {
      deletedAt: Date.now(),
    });
    const externalUserId = await ctx.db.insert("externalUsers", {
      createdAt: Date.now(),
      email: "widget@example.com",
      externalId: "widget-1",
      lastSeenAt: Date.now(),
      organizationId,
    });
    for (const vote of [
      { feedbackId: shipped, userId: VOTER._id },
      { externalUserId, feedbackId: shipped },
      { feedbackId: deleted, userId: SUBSCRIBER._id },
    ]) {
      await ctx.db.insert("feedbackVotes", {
        ...vote,
        createdAt: Date.now(),
        voteType: "upvote",
      });
    }
    for (const userId of [VOTER._id, SUBSCRIBER._id]) {
      await ctx.db.insert("feedbackSubscriptions", {
        createdAt: Date.now(),
        feedbackId: shipped,
        userId,
      });
    }
    const release = await ctx.db.insert("releases", {
      createdAt: Date.now(),
      organizationId,
      title: "v1.0.0",
      updatedAt: Date.now(),
    });
    for (const linked of [shipped, deleted]) {
      await ctx.db.insert("releaseFeedback", {
        createdAt: Date.now(),
        feedbackId: linked,
        releaseId: release,
      });
    }
    return { feedbackId: shipped, releaseId: release };
  });

  const notify = () =>
    t.mutation(internal.notifications.shipped.sendShippedNotifications, {
      releaseId,
    });

  const recipients = async () => {
    const jobs = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    );
    return jobs
      .filter((job) => job.name === SHIPPED_EMAIL)
      .map((job) => job.args[0]);
  };

  return { feedbackId, notify, recipients, t };
};

describe("feedback shipped email", () => {
  test("emails each account that voted on or follows the shipped feedback once", async () => {
    vi.stubEnv("SITE_URL", SITE_URL);
    const { feedbackId, notify, recipients } = await setup();

    await notify();

    const email = {
      feedbackTitle: "Dark mode",
      feedbackUrl: `${SITE_URL}/acme/feedback/${feedbackId}`,
      organizationName: "Acme",
      releaseTitle: "v1.0.0",
      releaseUrl: `${SITE_URL}/acme/changelog`,
      unsubscribeUrl: `${SITE_URL}/dashboard/account?tab=notifications`,
    };
    expect(await recipients()).toEqual([
      { ...email, to: VOTER.email },
      { ...email, to: SUBSCRIBER.email },
    ]);
  });

  test("skips accounts that turned shipped emails off", async () => {
    const { notify, recipients, t } = await setup();
    await t
      .withIdentity({ sessionId: VOTER._id, subject: VOTER._id })
      .mutation(api.notifications.preferences.updatePreferences, {
        emailOnFeedbackShipped: false,
      });

    await notify();

    expect((await recipients()).map((email) => email.to)).toEqual([
      SUBSCRIBER.email,
    ]);
  });

  test("skips suppressed addresses", async () => {
    const { notify, recipients, t } = await setup();
    await t.run((ctx) =>
      ctx.db.insert("emailSuppressions", {
        email: SUBSCRIBER.email,
        originalEventType: "email.bounced",
        reason: "hard_bounce",
        suppressedAt: Date.now(),
      })
    );

    await notify();

    expect((await recipients()).map((email) => email.to)).toEqual([
      VOTER.email,
    ]);
  });

  test("sends nothing for an organization without the Pro plan", async () => {
    const { notify, recipients } = await setup(null);

    await notify();

    expect(await recipients()).toEqual([]);
  });
});
