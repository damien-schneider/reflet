/**
 * CEO context queries — aggregated data for CEO reports and chat.
 */

import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";

/**
 * Build comprehensive context about product state for the CEO agent.
 * Returns aggregated data: task stats, activity, feedback, revenue.
 */
export const getCEOContext = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const allItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const taskStats = {
      total: allItems.length,
      todo: allItems.filter((w) => w.status === "todo").length,
      inProgress: allItems.filter((w) => w.status === "in_progress").length,
      done: allItems.filter((w) => w.status === "done").length,
      cancelled: allItems.filter((w) => w.status === "cancelled").length,
      byPriority: {
        critical: allItems.filter((w) => w.priority === "critical").length,
        high: allItems.filter((w) => w.priority === "high").length,
        medium: allItems.filter((w) => w.priority === "medium").length,
        low: allItems.filter((w) => w.priority === "low").length,
      },
    };

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activityInRange = recentActivity.filter(
      (a) => a.createdAt >= sevenDaysAgo
    );

    const activityByAgent: Record<string, number> = {};
    for (const activity of activityInRange) {
      activityByAgent[activity.agent] =
        (activityByAgent[activity.agent] ?? 0) + 1;
    }

    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeFeedback = allFeedback.filter(
      (f) => !(f.deletedAt || f.isMerged)
    );
    const feedbackStats = {
      total: activeFeedback.length,
      byStatus: {} as Record<string, number>,
    };

    for (const feedback of activeFeedback) {
      const status = feedback.status ?? "uncategorized";
      feedbackStats.byStatus[status] =
        (feedbackStats.byStatus[status] ?? 0) + 1;
    }

    // Count items needing review (replaces autopilotInboxItems)
    const reviewWorkItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();

    const reviewDocuments = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();

    const pendingReviewCount = reviewWorkItems.length + reviewDocuments.length;

    return {
      taskStats,
      activityByAgent,
      recentActivityCount: activityInRange.length,
      feedbackStats,
      pendingReviewCount,
    };
  },
});

/**
 * Get detailed context for the CEO chat — includes task titles, agent states,
 * recent errors, and pending inbox details (not just aggregate counts).
 */
export const getDetailedCEOContext = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const recentItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(20);

    const taskSummaries = recentItems.map((w) => ({
      title: w.title,
      status: w.status,
      priority: w.priority,
      agent: w.assignedAgent,
      type: w.type,
    }));

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const agentStates: Record<string, boolean> = {};
    if (config) {
      const agents = [
        "pm",
        "cto",
        "dev",
        "growth",
        "support",
        "sales",
      ] as const;
      for (const agent of agents) {
        const field = `${agent}Enabled` as keyof typeof config;
        agentStates[agent] = config[field] !== false;
      }
    }

    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);

    const recentErrors = recentActivity
      .filter((a) => a.level === "error")
      .slice(0, 10)
      .map((a) => ({
        agent: a.agent,
        message: a.message,
        ago: Math.round((Date.now() - a.createdAt) / 60_000),
      }));

    // Review items replace inbox items
    const reviewWorkItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .take(10);

    const reviewDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .take(10);

    const reviewSummaries = [
      ...reviewWorkItems.map((w) => ({
        title: w.title,
        type: w.reviewType ?? w.type,
        priority: w.priority,
      })),
      ...reviewDocs.map((d) => ({
        title: d.title,
        type: d.reviewType ?? d.type,
        priority: "medium" as const,
      })),
    ];

    return {
      taskSummaries,
      agentStates,
      recentErrors,
      reviewSummaries,
      autonomyMode: config?.autonomyMode ?? "supervised",
    };
  },
});
