/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testSchema = schema as any;

describe("onboarding", () => {
  test("onboardingProgress record can be created with default steps", async () => {
    const t = convexTest(testSchema, modules);

    const progressId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      return await ctx.db.insert("onboardingProgress", {
        organizationId: orgId,
        userId: "user_123",
        steps: {
          boardCreated: false,
          brandingCustomized: false,
          githubConnected: false,
          widgetInstalled: false,
          teamInvited: false,
          firstFeedbackCreated: false,
        },
        createdAt: Date.now(),
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
    const t = convexTest(testSchema, modules);

    const progressId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      return await ctx.db.insert("onboardingProgress", {
        organizationId: orgId,
        userId: "user_123",
        steps: {
          boardCreated: false,
          brandingCustomized: false,
          githubConnected: false,
          widgetInstalled: false,
          teamInvited: false,
          firstFeedbackCreated: false,
        },
        createdAt: Date.now(),
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
    const t = convexTest(testSchema, modules);

    const progressId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      return await ctx.db.insert("onboardingProgress", {
        organizationId: orgId,
        userId: "user_123",
        steps: {
          boardCreated: true,
          brandingCustomized: true,
          githubConnected: true,
          widgetInstalled: true,
          teamInvited: true,
          firstFeedbackCreated: true,
        },
        completedAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      const progress = await ctx.db.get(progressId);
      expect(progress?.completedAt).toBeDefined();
    });
  });

  test("dismissedAt prevents further step completion", async () => {
    const t = convexTest(testSchema, modules);

    const progressId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      return await ctx.db.insert("onboardingProgress", {
        organizationId: orgId,
        userId: "user_123",
        steps: {
          boardCreated: true,
          brandingCustomized: false,
          githubConnected: false,
          widgetInstalled: false,
          teamInvited: false,
          firstFeedbackCreated: false,
        },
        dismissedAt: Date.now(),
        createdAt: Date.now(),
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
    const t = convexTest(testSchema, modules);

    await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      await ctx.db.insert("onboardingProgress", {
        organizationId: orgId,
        userId: "user_123",
        steps: {
          boardCreated: true,
          brandingCustomized: false,
          githubConnected: false,
          widgetInstalled: false,
          teamInvited: false,
          firstFeedbackCreated: false,
        },
        createdAt: Date.now(),
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
