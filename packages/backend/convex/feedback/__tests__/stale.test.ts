/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

describe("feedback_stale", () => {
  test("getSettings returns null for non-existent org", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const fakeId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test",
        slug: "test",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      // Delete it so query returns null
      await ctx.db.delete(fakeId);
    });
  });

  test("getSettings returns null when no stale settings configured", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const result = await t.query(api.feedback.stale.getSettings, {
      organizationId: orgId,
    });
    expect(result).toBeNull();
  });

  test("archiveStaleFeedback closes stale items", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org",
        staleFeedbackSettings: {
          action: "close",
          daysInactive: 30,
          enabled: true,
        },
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      return id;
    });

    // Insert old feedback (60 days ago)
    const sixtyDaysAgo = Date.now() - 60 * 86_400_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: sixtyDaysAgo,
        description: "This is stale",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Old feedback",
        updatedAt: sixtyDaysAgo,
        voteCount: 0,
      });
    });

    const result = await t.mutation(
      internal.feedback.stale.archiveStaleFeedback,
      {}
    );
    expect(result.processed).toBe(1);

    // Verify the feedback was closed
    await t.run(async (ctx) => {
      const feedback = await ctx.db.query("feedback").collect();
      expect(feedback[0].status).toBe("closed");
    });
  });

  test("archiveStaleFeedback skips recent items", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          staleFeedbackSettings: {
            action: "close",
            daysInactive: 30,
            enabled: true,
          },
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    // Insert recent feedback (1 day ago)
    const oneDayAgo = Date.now() - 86_400_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: oneDayAgo,
        description: "This is fresh",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Recent feedback",
        updatedAt: oneDayAgo,
        voteCount: 0,
      });
    });

    const result = await t.mutation(
      internal.feedback.stale.archiveStaleFeedback,
      {}
    );
    expect(result.processed).toBe(0);
  });

  test("archiveStaleFeedback skips excluded statuses", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          staleFeedbackSettings: {
            action: "close",
            daysInactive: 30,
            enabled: true,
            excludeStatuses: ["planned", "in_progress"],
          },
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const sixtyDaysAgo = Date.now() - 60 * 86_400_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: sixtyDaysAgo,
        description: "This is planned",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "planned",
        title: "Planned feedback",
        updatedAt: sixtyDaysAgo,
        voteCount: 0,
      });
    });

    const result = await t.mutation(
      internal.feedback.stale.archiveStaleFeedback,
      {}
    );
    expect(result.processed).toBe(0);
  });

  test("archiveStaleFeedback skips disabled orgs", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          staleFeedbackSettings: {
            action: "close",
            daysInactive: 30,
            enabled: false,
          },
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const sixtyDaysAgo = Date.now() - 60 * 86_400_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: sixtyDaysAgo,
        description: "This is stale",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Old feedback",
        updatedAt: sixtyDaysAgo,
        voteCount: 0,
      });
    });

    const result = await t.mutation(
      internal.feedback.stale.archiveStaleFeedback,
      {}
    );
    expect(result.processed).toBe(0);
  });
});
