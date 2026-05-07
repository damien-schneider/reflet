/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import schema from "../../schema";
import {
  CONVEX_INTEGRATION_TEST_TIMEOUT_MS,
  modules,
} from "../../test.helpers";

describe("feedback_stale", () => {
  test("getSettings returns null for non-existent org", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const fakeId = await ctx.db.insert("organizations", {
        name: "Test",
        slug: "test",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
      // Delete it so query returns null
      await ctx.db.delete(fakeId);
    });
  });

  test(
    "getSettings returns null when no stale settings configured",
    async () => {
      const t = convexTest(schema, modules);

      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          slug: "test-org",
          isPublic: false,
          subscriptionTier: "free",
          subscriptionStatus: "none",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(api.feedback.stale.getSettings, {
        organizationId: orgId,
      });
      expect(result).toBeNull();
    },
    CONVEX_INTEGRATION_TEST_TIMEOUT_MS
  );

  test("archiveStaleFeedback closes stale items", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
        staleFeedbackSettings: {
          enabled: true,
          daysInactive: 30,
          action: "close",
        },
      });
      return id;
    });

    // Insert old feedback (60 days ago)
    const sixtyDaysAgo = Date.now() - 60 * 86_400_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Old feedback",
        description: "This is stale",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: sixtyDaysAgo,
        updatedAt: sixtyDaysAgo,
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

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
        staleFeedbackSettings: {
          enabled: true,
          daysInactive: 30,
          action: "close",
        },
      });
    });

    // Insert recent feedback (1 day ago)
    const oneDayAgo = Date.now() - 86_400_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Recent feedback",
        description: "This is fresh",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: oneDayAgo,
        updatedAt: oneDayAgo,
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

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
        staleFeedbackSettings: {
          enabled: true,
          daysInactive: 30,
          action: "close",
          excludeStatuses: ["planned", "in_progress"],
        },
      });
    });

    const sixtyDaysAgo = Date.now() - 60 * 86_400_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Planned feedback",
        description: "This is planned",
        status: "planned",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: sixtyDaysAgo,
        updatedAt: sixtyDaysAgo,
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

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
        staleFeedbackSettings: {
          enabled: false,
          daysInactive: 30,
          action: "close",
        },
      });
    });

    const sixtyDaysAgo = Date.now() - 60 * 86_400_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Old feedback",
        description: "This is stale",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: sixtyDaysAgo,
        updatedAt: sixtyDaysAgo,
      });
    });

    const result = await t.mutation(
      internal.feedback.stale.archiveStaleFeedback,
      {}
    );
    expect(result.processed).toBe(0);
  });
});
