import { describe, expect, test, vi } from "vitest";
import { internal } from "../../_generated/api";
import { setupTest } from "../../test.helpers";
import { evaluateFeedbackTriage } from "../triage_evaluation";

vi.mock("../triage_evaluation", () => ({
  evaluateFeedbackTriage: vi.fn(async () => ({
    answers: [
      { probability: 0.04, questionId: "junk" },
      { probability: 0.83, questionId: "needsReview" },
      { probability: 0.94, questionId: "usefulness" },
    ],
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
    const t = setupTest();
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
      { feedbackId }
    );
    const feedback = await t.run(async (ctx) => await ctx.db.get(feedbackId));

    expect(result).toEqual({ success: true, tagCount: 0 });
    expect(feedback?.aiUsefulness).toBe(0.94);
    expect(feedback?.aiNeedsReview).toBe(0.83);
    expect(feedback?.aiJunk).toBe(0.04);
    expect(feedback?.aiPriority).toBeUndefined();
    const runs = await t.run((ctx) =>
      ctx.db.query("feedbackTriageRuns").collect()
    );
    expect(runs).toMatchObject([
      {
        input: {
          description: "Checkout fails on mobile",
          title: "Checkout failure",
        },
        model: "jev-1.13",
        status: "completed",
      },
    ]);
    expect(runs[0].questions).toHaveLength(3);
    expect(runs[0].answers).toHaveLength(3);
  });
});

test("an incomplete triage result fails the run and applies the board policy", async () => {
  const t = setupTest();
  const feedbackId = await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      createdAt: Date.now(),
      isPublic: true,
      name: "Test Org",
      slug: "test-org-incomplete",
      subscriptionStatus: "none",
      subscriptionTier: "free",
    });
    return await ctx.db.insert("feedback", {
      commentCount: 0,
      createdAt: Date.now(),
      description: "Export button does nothing",
      isApproved: false,
      isPinned: false,
      organizationId,
      status: "open",
      title: "Export broken",
      updatedAt: Date.now(),
      voteCount: 0,
    });
  });
  vi.mocked(evaluateFeedbackTriage).mockResolvedValueOnce({
    answers: [],
    junk: 0,
    needsReview: 0,
    tagIds: [],
    usefulness: 1,
    withhold: false,
  });

  const result = await t.action(
    internal.feedback.auto_tagging_actions.processAutoTagging,
    { feedbackId }
  );

  expect(result).toMatchObject({ success: false });
  const runs = await t.run((ctx) =>
    ctx.db.query("feedbackTriageRuns").collect()
  );
  expect(runs.map((run) => run.status)).toEqual(["failed"]);
  expect((await t.run((ctx) => ctx.db.get(feedbackId)))?.isApproved).toBe(true);
});
