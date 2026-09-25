import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

vi.mock("../triage_evaluation", () => ({
  evaluateFeedbackTriage: vi.fn(async () => ({
    junk: 0.04,
    needsReview: 0.83,
    tagIds: [],
    usefulness: 0.94,
    withhold: false,
  })),
  isTriageConfigured: () => true,
}));

describe("feedback triage action", () => {
  test("finishes after JEV scores even when no tag matches", async () => {
    const t = convexTest(schema, modules);
    const feedbackId = await t.run(async (ctx) => {
      const organizationId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org-triage-action",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      return await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Checkout fails on mobile",
        isApproved: true,
        isPinned: false,
        organizationId,
        status: "open",
        title: "Checkout failure",
        updatedAt: Date.now(),
        voteCount: 0,
      });
    });

    const result = await t.action(
      internal.feedback.auto_tagging_actions.processAutoTagging,
      { applyModeration: false, feedbackId }
    );
    const feedback = await t.run(async (ctx) => await ctx.db.get(feedbackId));

    expect(result).toEqual({ success: true, tagCount: 0 });
    expect(feedback?.aiUsefulness).toBe(0.94);
    expect(feedback?.aiNeedsReview).toBe(0.83);
    expect(feedback?.aiJunk).toBe(0.04);
    expect(feedback?.aiPriority).toBeUndefined();
  });
});
