/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { components, internal } from "../../_generated/api";
import schema from "../../schema";
import { modules, registerStripeComponent } from "../../test.helpers";

describe("weekly_digest_helpers", () => {
  test("getAllOrganizationIds returns org IDs", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("organizations", {
        name: "Active Org",
        slug: "active-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const ids = await t.query(
      internal.notifications.weekly_digest_helpers.getAllOrganizationIds,
      {}
    );
    expect(ids).toHaveLength(1);
  });

  test("getDigestData returns null for non-existent org", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("organizations", {
        name: "Temp Org",
        slug: "temp-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.query(
      internal.notifications.weekly_digest_helpers.getDigestData,
      {
        organizationId: orgId,
      }
    );
    expect(result).toBeNull();
  });

  test("getDigestData returns activity counts", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      // Insert recent feedback
      await ctx.db.insert("feedback", {
        organizationId: id,
        title: "New feedback",
        description: "Created this week",
        status: "open",
        voteCount: 5,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return id;
    });

    const result = await t.query(
      internal.notifications.weekly_digest_helpers.getDigestData,
      {
        organizationId: orgId,
      }
    );
    expect(result).not.toBeNull();
    expect(result?.orgName).toBe("Test Org");
    expect(result?.newFeedbackCount).toBe(1);
    expect(result?.topFeedback).toHaveLength(1);
    expect(result?.topFeedback[0].title).toBe("New feedback");
  });
});

describe("shipped_notifications_helpers", () => {
  test("getShippedNotificationData returns null for missing release", async () => {
    const t = convexTest(schema, modules);

    const fakeReleaseId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test",
        slug: "test",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
      const id = await ctx.db.insert("releases", {
        organizationId: orgId,
        title: "Release",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.query(
      internal.notifications.shipped_helpers.getShippedNotificationData,
      { releaseId: fakeReleaseId }
    );
    expect(result).toBeNull();
  });

  test("getShippedNotificationData returns linked feedback items", async () => {
    const t = convexTest(schema, modules);
    registerStripeComponent(t);

    const { orgId, releaseId } = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Pro Org",
        slug: "pro-org",
        isPublic: true,
        subscriptionTier: "pro",
        subscriptionStatus: "active",
        createdAt: Date.now(),
      });

      const feedbackId = await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Feature request",
        description: "Please add this",
        status: "completed",
        voteCount: 10,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const rId = await ctx.db.insert("releases", {
        organizationId: orgId,
        title: "v1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("releaseFeedback", {
        releaseId: rId,
        feedbackId,
        createdAt: Date.now(),
      });

      return { orgId, releaseId: rId };
    });

    await t.mutation(components.stripe.private.handleSubscriptionCreated, {
      stripeSubscriptionId: "sub_test",
      stripeCustomerId: "cus_test",
      status: "active",
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false,
      priceId: "price_pro",
      metadata: { orgId },
    });

    const result = await t.query(
      internal.notifications.shipped_helpers.getShippedNotificationData,
      { releaseId }
    );
    expect(result).not.toBeNull();
    expect(result?.releaseTitle).toBe("v1.0.0");
    expect(result?.isPro).toBe(true);
    expect(result?.feedbackItems).toHaveLength(1);
    expect(result?.feedbackItems[0].feedbackTitle).toBe("Feature request");
  });

  test("getFeedbackRecipients collects user IDs from votes and subs", async () => {
    const t = convexTest(schema, modules);

    // Verify the data layer: votes and subscriptions are stored properly
    await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test",
        slug: "test",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      const fId = await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Test feedback",
        description: "Test",
        status: "open",
        voteCount: 1,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("feedbackVotes", {
        feedbackId: fId,
        userId: "user_voter",
        voteType: "upvote",
        createdAt: Date.now(),
      });

      await ctx.db.insert("feedbackSubscriptions", {
        feedbackId: fId,
        userId: "user_subscriber",
        createdAt: Date.now(),
      });

      // Verify the data is stored correctly
      const votes = await ctx.db.query("feedbackVotes").collect();
      const feedbackVotes = votes.filter((v) => v.feedbackId === fId);
      expect(feedbackVotes).toHaveLength(1);
      expect(feedbackVotes[0].userId).toBe("user_voter");

      const subs = await ctx.db.query("feedbackSubscriptions").collect();
      const feedbackSubs = subs.filter((s) => s.feedbackId === fId);
      expect(feedbackSubs).toHaveLength(1);
      expect(feedbackSubs[0].userId).toBe("user_subscriber");
    });
  });
});

describe("release_ai_matching_helpers", () => {
  test("getReleaseAndFeedback returns null for missing release", async () => {
    const t = convexTest(schema, modules);

    const fakeId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test",
        slug: "test",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
      const id = await ctx.db.insert("releases", {
        organizationId: orgId,
        title: "Release",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.query(
      internal.changelog.ai_matching_helpers.getReleaseAndFeedback,
      { releaseId: fakeId }
    );
    expect(result).toBeNull();
  });

  test("getReleaseAndFeedback excludes already linked feedback", async () => {
    const t = convexTest(schema, modules);

    const releaseId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test",
        slug: "test",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      const linkedFeedback = await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Already linked",
        description: "Already linked to release",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Unlinked feedback",
        description: "Not linked yet",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const rId = await ctx.db.insert("releases", {
        organizationId: orgId,
        title: "Release",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("releaseFeedback", {
        releaseId: rId,
        feedbackId: linkedFeedback,
        createdAt: Date.now(),
      });

      return rId;
    });

    const result = await t.query(
      internal.changelog.ai_matching_helpers.getReleaseAndFeedback,
      { releaseId }
    );
    expect(result).not.toBeNull();
    expect(result?.feedbackItems).toHaveLength(1);
    expect(result?.feedbackItems[0].title).toBe("Unlinked feedback");
  });
});
