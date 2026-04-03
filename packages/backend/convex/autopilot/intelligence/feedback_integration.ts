import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

// ============================================
// PRIORITY RANKING (higher index = higher priority)
// ============================================

const PRIORITY_RANK: Record<string, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// ============================================
// QUERIES
// ============================================

/**
 * Get insights that reference a specific feedback item
 */
export const getInsightsForFeedback = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const insights = await ctx.db
      .query("intelligenceInsights")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .collect();

    return insights.filter(
      (insight) => insight.linkedFeedbackIds?.includes(args.feedbackId) ?? false
    );
  },
});

/**
 * Get community signals related to a feedback item (via linked insights)
 */
export const getSignalsForFeedback = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const insights = await ctx.db
      .query("intelligenceInsights")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .collect();

    const linkedInsights = insights.filter(
      (insight) => insight.linkedFeedbackIds?.includes(args.feedbackId) ?? false
    );

    const signalIdSet = new Set<Id<"intelligenceSignals">>();
    for (const insight of linkedInsights) {
      for (const signalId of insight.signalIds) {
        signalIdSet.add(signalId);
      }
    }

    const signals = await Promise.all(
      [...signalIdSet].map((signalId) => ctx.db.get(signalId))
    );

    return signals.filter(Boolean);
  },
});

/**
 * Check if competitors have the feature related to a feedback item
 */
export const getCompetitorStatusForFeedback = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const featureComparison = await ctx.db
      .query("featureComparisons")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .unique();

    if (!featureComparison) {
      return null;
    }

    const feedbackTitleLower = feedback.title.toLowerCase();

    const matchingFeatures = featureComparison.features.filter((feature) => {
      const featureNameLower = feature.featureName.toLowerCase();
      return (
        featureNameLower.includes(feedbackTitleLower) ||
        feedbackTitleLower.includes(featureNameLower)
      );
    });

    if (matchingFeatures.length === 0) {
      return null;
    }

    let totalCompetitors = 0;
    let competitorsWithFeature = 0;

    for (const feature of matchingFeatures) {
      for (const competitor of feature.competitors) {
        totalCompetitors++;
        if (competitor.hasIt) {
          competitorsWithFeature++;
        }
      }
    }

    return {
      competitorsWithFeature,
      totalCompetitors,
      matchingFeatures: matchingFeatures.map((f) => ({
        featureName: f.featureName,
        userProductHasIt: f.userProductHasIt,
        competitors: f.competitors,
      })),
    };
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Apply a priority boost to a feedback item if the new priority is higher
 */
export const applyPriorityBoost = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    boostReason: v.string(),
    newPriority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("none")
    ),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return;
    }

    const currentRank = PRIORITY_RANK[feedback.aiPriority ?? "none"] ?? 0;
    const newRank = PRIORITY_RANK[args.newPriority] ?? 0;

    if (newRank > currentRank) {
      await ctx.db.patch(args.feedbackId, {
        aiPriority: args.newPriority,
        aiPriorityReasoning: args.boostReason,
        aiPriorityGeneratedAt: Date.now(),
      });
    }
  },
});

// ============================================
// INTERNAL ACTIONS
// ============================================

type FeedbackPriority = "critical" | "high" | "medium" | "low" | "none";

const INSIGHT_PRIORITY_TO_FEEDBACK_PRIORITY: Record<string, FeedbackPriority> =
  {
    critical: "critical",
    high: "high",
    medium: "medium",
    low: "low",
  };

/**
 * For an org, look at all "new" insights with linkedFeedbackIds
 * and apply priority boosts to those feedback items
 */
export const runPriorityBoostForOrg = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const insights = await ctx.runQuery(
      internal.autopilot.intelligence.feedback_integration
        .getNewInsightsWithFeedback,
      { organizationId: args.organizationId }
    );

    let boostsApplied = 0;

    for (const insight of insights) {
      const feedbackPriority: FeedbackPriority =
        INSIGHT_PRIORITY_TO_FEEDBACK_PRIORITY[insight.priority] ?? "low";
      const boostReason = `Intelligence insight "${insight.title}" (${insight.type}, ${insight.priority} priority): ${insight.summary}`;

      for (const feedbackId of insight.linkedFeedbackIds ?? []) {
        await ctx.runMutation(
          internal.autopilot.intelligence.feedback_integration
            .applyPriorityBoost,
          {
            feedbackId,
            boostReason,
            newPriority: feedbackPriority,
          }
        );
        boostsApplied++;
      }
    }

    return { boostsApplied };
  },
});

// ============================================
// INTERNAL QUERIES (used by the action above)
// ============================================

/**
 * Get "new" insights that have linked feedback IDs for an org
 */
export const getNewInsightsWithFeedback = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("intelligenceInsights")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "new")
      )
      .collect();

    return insights.filter(
      (insight) =>
        insight.linkedFeedbackIds !== undefined &&
        insight.linkedFeedbackIds.length > 0
    );
  },
});
