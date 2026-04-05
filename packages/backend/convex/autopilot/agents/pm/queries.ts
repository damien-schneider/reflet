/**
 * PM queries — feedback and existing tasks.
 */

import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";

/**
 * Get feedback items for a specific organization.
 * Returns feedback with vote counts and AI-assessed priority.
 */
export const getFeedbackForOrganization = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeFeedback = feedbackItems.filter(
      (f) => !(f.deletedAt || f.isMerged)
    );

    const feedbackWithVotes = await Promise.all(
      activeFeedback.map(async (feedback) => {
        const votes = await ctx.db
          .query("feedbackVotes")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
          .collect();

        return {
          _id: feedback._id,
          title: feedback.title,
          description: feedback.description || "",
          status: feedback.status,
          aiPriority: feedback.aiPriority,
          aiComplexity: feedback.aiComplexity,
          voteCount: votes.length,
          createdAt: feedback.createdAt,
          updatedAt: feedback.updatedAt,
        };
      })
    );

    return feedbackWithVotes;
  },
});

/**
 * Get all existing autopilot work items for the organization to avoid duplicates.
 */
export const getExistingTasksForOrganization = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeItems = items.filter(
      (w) => w.status !== "done" && w.status !== "cancelled"
    );

    return activeItems.map((w) => ({
      _id: w._id,
      title: w.title,
      status: w.status,
      type: w.type,
    }));
  },
});

/**
 * Calculate a composite score for a feedback item based on multiple signals.
 */
export const calculateFeedbackScore = (feedbackData: {
  voteCount: number;
  aiPriority?: string;
  recencyDays: number;
  hasCompetitorGap: boolean;
  revenueImpact: number;
}): number => {
  let score = 0;

  // Vote weight: 0-25 points (normalized to max 50 votes)
  score += Math.min((feedbackData.voteCount / 50) * 25, 25);

  // AI priority weight: 0-20 points
  const priorityMap = {
    critical: 20,
    high: 15,
    medium: 10,
    low: 5,
    none: 0,
  } as const;
  score +=
    priorityMap[
      (feedbackData.aiPriority || "medium") as keyof typeof priorityMap
    ];

  // Competitor gap weight: 0-15 points
  if (feedbackData.hasCompetitorGap) {
    score += 15;
  }

  // Revenue weight: 0-15 points (0-1.0 scale)
  score += feedbackData.revenueImpact * 15;

  // Recency weight: 0-10 points
  if (feedbackData.recencyDays <= 30) {
    score += 10;
  } else if (feedbackData.recencyDays <= 60) {
    score += 5;
  }

  return Math.round(score * 100) / 100;
};
