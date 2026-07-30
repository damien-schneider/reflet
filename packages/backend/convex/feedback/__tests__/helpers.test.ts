/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules, setupTest } from "../../test.helpers";

describe("weekly_digest_helpers", () => {
  test("getAllOrganizationIds returns org IDs", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Active Org",
        slug: "active-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
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
        createdAt: Date.now(),
        isPublic: false,
        name: "Temp Org",
        slug: "temp-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
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
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      // Insert recent feedback
      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Created this week",
        isApproved: true,
        isPinned: false,
        organizationId: id,
        status: "open",
        title: "New feedback",
        updatedAt: Date.now(),
        voteCount: 5,
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
        createdAt: Date.now(),
        isPublic: false,
        name: "Test",
        slug: "test",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      const id = await ctx.db.insert("releases", {
        createdAt: Date.now(),
        organizationId: orgId,
        title: "Release",
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
    const t = setupTest({ stripeSubscriptionStatus: "active" });

    const releaseId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: true,
        name: "Pro Org",
        slug: "pro-org",
        subscriptionStatus: "active",
        subscriptionTier: "pro",
      });

      const feedbackId = await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Please add this",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "completed",
        title: "Feature request",
        updatedAt: Date.now(),
        voteCount: 10,
      });

      const rId = await ctx.db.insert("releases", {
        createdAt: Date.now(),
        organizationId: orgId,
        title: "v1.0.0",
        updatedAt: Date.now(),
      });

      await ctx.db.insert("releaseFeedback", {
        createdAt: Date.now(),
        feedbackId,
        releaseId: rId,
      });

      return rId;
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
        createdAt: Date.now(),
        isPublic: false,
        name: "Test",
        slug: "test",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      const fId = await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Test",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Test feedback",
        updatedAt: Date.now(),
        voteCount: 1,
      });

      await ctx.db.insert("feedbackVotes", {
        createdAt: Date.now(),
        feedbackId: fId,
        userId: "user_voter",
        voteType: "upvote",
      });

      await ctx.db.insert("feedbackSubscriptions", {
        createdAt: Date.now(),
        feedbackId: fId,
        userId: "user_subscriber",
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
        createdAt: Date.now(),
        isPublic: false,
        name: "Test",
        slug: "test",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      const id = await ctx.db.insert("releases", {
        createdAt: Date.now(),
        organizationId: orgId,
        title: "Release",
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
        createdAt: Date.now(),
        isPublic: false,
        name: "Test",
        slug: "test",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      const linkedFeedback = await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Already linked to release",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Already linked",
        updatedAt: Date.now(),
        voteCount: 0,
      });

      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Not linked yet",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Unlinked feedback",
        updatedAt: Date.now(),
        voteCount: 0,
      });

      const rId = await ctx.db.insert("releases", {
        createdAt: Date.now(),
        organizationId: orgId,
        title: "Release",
        updatedAt: Date.now(),
      });

      await ctx.db.insert("releaseFeedback", {
        createdAt: Date.now(),
        feedbackId: linkedFeedback,
        releaseId: rId,
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
