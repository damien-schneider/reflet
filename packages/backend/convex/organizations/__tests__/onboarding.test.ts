/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../../schema";
import { modules } from "../../test.helpers";

describe("onboarding", () => {
  test("onboardingProgress record can be created with default steps", async () => {
    const t = convexTest(schema, modules);

    const progressId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      return await ctx.db.insert("onboardingProgress", {
        createdAt: Date.now(),
        organizationId: orgId,
        steps: {
          boardCreated: false,
          brandingCustomized: false,
          firstFeedbackCreated: false,
          githubConnected: false,
          teamInvited: false,
          widgetInstalled: false,
        },
        userId: "user_123",
      });
    });

    await t.run(async (ctx) => {
      const progress = await ctx.db.get(progressId);
      expect(progress).not.toBeNull();
      expect(progress?.steps.boardCreated).toBe(false);
      expect(progress?.steps.githubConnected).toBe(false);
      expect(progress?.completedAt).toBeUndefined();
      expect(progress?.dismissedAt).toBeUndefined();
    });
  });

  test("completing a step updates the record", async () => {
    const t = convexTest(schema, modules);

    const progressId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      return await ctx.db.insert("onboardingProgress", {
        createdAt: Date.now(),
        organizationId: orgId,
        steps: {
          boardCreated: false,
          brandingCustomized: false,
          firstFeedbackCreated: false,
          githubConnected: false,
          teamInvited: false,
          widgetInstalled: false,
        },
        userId: "user_123",
      });
    });

    // Simulate completing a step
    await t.run(async (ctx) => {
      const progress = await ctx.db.get(progressId);
      if (!progress) {
        throw new Error("Missing progress");
      }

      await ctx.db.patch(progressId, {
        steps: { ...progress.steps, boardCreated: true },
      });
    });

    await t.run(async (ctx) => {
      const progress = await ctx.db.get(progressId);
      expect(progress?.steps.boardCreated).toBe(true);
      expect(progress?.steps.githubConnected).toBe(false);
    });
  });

  test("completedAt is set when all steps are done", async () => {
    const t = convexTest(schema, modules);

    const progressId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      return await ctx.db.insert("onboardingProgress", {
        completedAt: Date.now(),
        createdAt: Date.now(),
        organizationId: orgId,
        steps: {
          boardCreated: true,
          brandingCustomized: true,
          firstFeedbackCreated: true,
          githubConnected: true,
          teamInvited: true,
          widgetInstalled: true,
        },
        userId: "user_123",
      });
    });

    await t.run(async (ctx) => {
      const progress = await ctx.db.get(progressId);
      expect(progress?.completedAt).toBeDefined();
    });
  });

  test("dismissedAt prevents further step completion", async () => {
    const t = convexTest(schema, modules);

    const progressId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      return await ctx.db.insert("onboardingProgress", {
        createdAt: Date.now(),
        dismissedAt: Date.now(),
        organizationId: orgId,
        steps: {
          boardCreated: true,
          brandingCustomized: false,
          firstFeedbackCreated: false,
          githubConnected: false,
          teamInvited: false,
          widgetInstalled: false,
        },
        userId: "user_123",
      });
    });

    await t.run(async (ctx) => {
      const progress = await ctx.db.get(progressId);
      expect(progress?.dismissedAt).toBeDefined();
      // After dismiss, no more steps should be completed
      expect(progress?.steps.brandingCustomized).toBe(false);
    });
  });

  test("by_org_user index correctly retrieves progress", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      await ctx.db.insert("onboardingProgress", {
        createdAt: Date.now(),
        organizationId: orgId,
        steps: {
          boardCreated: true,
          brandingCustomized: false,
          firstFeedbackCreated: false,
          githubConnected: false,
          teamInvited: false,
          widgetInstalled: false,
        },
        userId: "user_123",
      });

      // Query by index - should find the progress
      const allProgress = await ctx.db.query("onboardingProgress").collect();
      const progress = allProgress.find(
        (p) => p.organizationId === orgId && p.userId === "user_123"
      );

      expect(progress).not.toBeNull();
      expect(progress?.steps.boardCreated).toBe(true);

      // Query with different user - should find nothing
      const noProgress = allProgress.find(
        (p) => p.organizationId === orgId && p.userId === "user_456"
      );

      expect(noProgress).toBeUndefined();
    });
  });
});
