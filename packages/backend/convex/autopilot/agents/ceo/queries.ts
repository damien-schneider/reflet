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
    const allTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const taskStats = {
      total: allTasks.length,
      pending: allTasks.filter((t) => t.status === "pending").length,
      inProgress: allTasks.filter((t) => t.status === "in_progress").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      failed: allTasks.filter((t) => t.status === "failed").length,
      byPriority: {
        critical: allTasks.filter((t) => t.priority === "critical").length,
        high: allTasks.filter((t) => t.priority === "high").length,
        medium: allTasks.filter((t) => t.priority === "medium").length,
        low: allTasks.filter((t) => t.priority === "low").length,
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

    const inboxItems = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const pendingInboxItems = inboxItems.filter(
      (item) => item.status === "pending"
    );

    return {
      taskStats,
      activityByAgent,
      recentActivityCount: activityInRange.length,
      feedbackStats,
      pendingInboxCount: pendingInboxItems.length,
      inboxItemsByType: inboxItems.reduce(
        (acc, item) => {
          acc[item.type] = (acc[item.type] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
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
    const recentTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(20);

    const taskSummaries = recentTasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      agent: t.assignedAgent,
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

    const pendingInbox = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .order("desc")
      .take(10);

    const inboxSummaries = pendingInbox.map((item) => ({
      title: item.title,
      type: item.type,
      priority: item.priority,
    }));

    return {
      taskSummaries,
      agentStates,
      recentErrors,
      inboxSummaries,
      autonomyMode: config?.autonomyMode ?? "supervised",
    };
  },
});
