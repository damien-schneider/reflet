/**
 * Dashboard queries — stats and agent readiness.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  DEFAULT_MAX_PENDING_PER_AGENT,
  DEFAULT_MAX_PENDING_TOTAL,
} from "../config_task_caps";
import {
  assignedAgent,
  autonomyLevel,
  autonomyMode,
} from "../schema/validators";
import { requireOrgMembership } from "./auth";

const dashboardStatsValidator = v.object({
  autonomyLevel,
  autonomyMode,
  costUsedTodayUsd: v.number(),
  dailyCostCapUsd: v.optional(v.number()),
  doneCount: v.number(),
  enabled: v.boolean(),
  inProgressCount: v.number(),
  maxPendingTasksPerAgent: v.number(),
  maxPendingTasksTotal: v.number(),
  maxTasksPerDay: v.number(),
  pendingReviewCount: v.number(),
  tasksUsedToday: v.number(),
  todoCount: v.number(),
  itemsByAgent: v.record(v.string(), v.number()),
});

const agentPerformanceValidator = v.array(
  v.object({
    agent: assignedAgent,
    approvalRate: v.number(),
    documentsApproved: v.number(),
    documentsCreated: v.number(),
    errorCount: v.number(),
    successCount: v.number(),
    successRate: v.number(),
    totalActions: v.number(),
  })
);

const chartTimelinePointValidator = v.object({
  actions: v.number(),
  date: v.string(),
  errors: v.number(),
  successes: v.number(),
});

const chartDataValidator = v.object({
  activityTimeline: v.array(chartTimelinePointValidator),
  agentCounts: v.record(v.string(), v.number()),
  statusCounts: v.record(v.string(), v.number()),
  typeCounts: v.record(v.string(), v.number()),
});

const agentReadinessValidator = v.record(
  v.string(),
  v.object({
    actionUrl: v.optional(v.string()),
    ready: v.boolean(),
    reason: v.optional(v.string()),
  })
);

const contentQualityOverviewValidator = v.object({
  byAgent: v.record(v.string(), v.number()),
  shortContent: v.number(),
  totalPending: v.number(),
});

export const getDashboardStats = query({
  args: { organizationId: v.id("organizations") },
  returns: dashboardStatsValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    const inProgressItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const doneItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "done")
      )
      .collect();

    const pendingReviewItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();

    const pendingReviewDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();
    const pendingReviewReports = await ctx.db
      .query("autopilotReports")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    const maxPendingTasksPerAgent =
      config?.maxPendingTasksPerAgent ?? DEFAULT_MAX_PENDING_PER_AGENT;
    const maxPendingTasksTotal =
      config?.maxPendingTasksTotal ?? DEFAULT_MAX_PENDING_TOTAL;
    const itemsByAgent: Record<string, number> = {};
    for (const item of [...todoItems, ...inProgressItems]) {
      const agent = item.assignedAgent ?? "unassigned";
      itemsByAgent[agent] = (itemsByAgent[agent] ?? 0) + 1;
    }

    return {
      enabled: Boolean(
        config?.enabled && (config.autonomyMode ?? "supervised") !== "stopped"
      ),
      autonomyLevel: config?.autonomyLevel ?? "review_required",
      autonomyMode: config?.autonomyMode ?? "supervised",
      tasksUsedToday: config?.tasksUsedToday ?? 0,
      maxTasksPerDay: config?.maxTasksPerDay ?? 10,
      costUsedTodayUsd: config?.costUsedTodayUsd ?? 0,
      dailyCostCapUsd: config?.dailyCostCapUsd,
      todoCount: todoItems.length,
      inProgressCount: inProgressItems.length,
      doneCount: doneItems.length,
      pendingReviewCount:
        pendingReviewItems.length +
        pendingReviewDocs.length +
        pendingReviewReports.length,
      maxPendingTasksPerAgent,
      maxPendingTasksTotal,
      itemsByAgent,
    };
  },
});

/**
 * Chart data — activity over the last 7 days and task breakdown by type/status.
 */
export const getChartData = query({
  args: { organizationId: v.id("organizations") },
  returns: chartDataValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Activity over last 7 days
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .gte("createdAt", sevenDaysAgo)
      )
      .collect();

    // Bucket activity by day
    const activityByDay: Record<
      string,
      { actions: number; errors: number; successes: number }
    > = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      activityByDay[key] = { actions: 0, errors: 0, successes: 0 };
    }
    for (const entry of recentActivity) {
      const key = new Date(entry.createdAt).toISOString().slice(0, 10);
      if (activityByDay[key]) {
        activityByDay[key].actions++;
        if (entry.level === "error") {
          activityByDay[key].errors++;
        }
        if (entry.level === "success") {
          activityByDay[key].successes++;
        }
      }
    }
    const activityTimeline = Object.entries(activityByDay).map(
      ([date, data]) => ({
        date,
        ...data,
      })
    );

    // Work items by status
    const allItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const agentCounts: Record<string, number> = {};
    for (const item of allItems) {
      statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
      typeCounts[item.type] = (typeCounts[item.type] ?? 0) + 1;
      const agent = item.assignedAgent ?? "unassigned";
      agentCounts[agent] = (agentCounts[agent] ?? 0) + 1;
    }

    return {
      activityTimeline,
      statusCounts,
      typeCounts,
      agentCounts,
    };
  },
});

/**
 * Agent readiness — currently always returns an empty map since coding
 * adapter credentials were removed. Kept as a stable hook for future
 * provider integrations (e.g. GitHub issue delegation).
 */
export const getAgentReadiness = query({
  args: { organizationId: v.id("organizations") },
  returns: agentReadinessValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);
    return {};
  },
});

/**
 * Agent performance scores — 7-day rolling metrics per agent.
 */
export const getAgentPerformance = query({
  args: { organizationId: v.id("organizations") },
  returns: agentPerformanceValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", cutoff)
      )
      .collect();

    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(500);

    const agents = ["pm", "cto", "growth", "support", "sales"] as const;

    return agents.map((agent) => {
      const agentLogs = logs.filter((l) => l.agent === agent);
      const totalActions = agentLogs.filter((l) => l.level === "action").length;
      const successCount = agentLogs.filter(
        (l) => l.level === "success"
      ).length;
      const errorCount = agentLogs.filter((l) => l.level === "error").length;

      const agentDocs = docs.filter(
        (d) => d.sourceAgent === agent && d.createdAt > cutoff
      );
      const approvedDocs = agentDocs.filter(
        (d) => d.status === "published"
      ).length;

      return {
        agent,
        totalActions,
        successCount,
        errorCount,
        successRate: totalActions > 0 ? successCount / totalActions : 0,
        documentsCreated: agentDocs.length,
        documentsApproved: approvedDocs,
        approvalRate:
          agentDocs.length > 0 ? approvedDocs / agentDocs.length : 0,
      };
    });
  },
});

/**
 * Content quality overview — pending review items with quality scores.
 */
export const getContentQualityOverview = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: contentQualityOverviewValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);

    const pendingDocs = docs.filter((d) => d.status === "pending_review");

    const totalPending = pendingDocs.length;
    const shortContent = pendingDocs.filter(
      (d) => d.content.length < 200
    ).length;
    const byAgent: Record<string, number> = {};

    for (const doc of pendingDocs) {
      const agent = doc.sourceAgent ?? "unknown";
      byAgent[agent] = (byAgent[agent] ?? 0) + 1;
    }

    return {
      totalPending,
      shortContent,
      byAgent,
    };
  },
});
