/**
 * Dashboard queries — stats and agent readiness.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const getDashboardStats = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const pendingTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const inProgressTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const completedTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .collect();

    const pendingInbox = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    return {
      enabled: config?.enabled ?? false,
      adapter: config?.adapter ?? "builtin",
      autonomyLevel: config?.autonomyLevel ?? "review_required",
      autonomyMode: config?.autonomyMode ?? "supervised",
      tasksUsedToday: config?.tasksUsedToday ?? 0,
      maxTasksPerDay: config?.maxTasksPerDay ?? 10,
      costUsedTodayUsd: config?.costUsedTodayUsd ?? 0,
      dailyCostCapUsd: config?.dailyCostCapUsd,
      pendingTaskCount: pendingTasks.length,
      inProgressTaskCount: inProgressTasks.length,
      completedTaskCount: completedTasks.length,
      pendingInboxCount: pendingInbox.length,
      maxPendingTasksPerAgent: config?.maxPendingTasksPerAgent ?? 2,
      maxPendingTasksTotal: config?.maxPendingTasksTotal ?? 5,
      pendingTasksByAgent: Object.fromEntries(
        pendingTasks.reduce((acc, t) => {
          acc.set(t.assignedAgent, (acc.get(t.assignedAgent) ?? 0) + 1);
          return acc;
        }, new Map<string, number>())
      ),
    };
  },
});

export const getAgentReadiness = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      return {};
    }

    const readiness: Record<
      string,
      { ready: boolean; reason?: string; actionUrl?: string }
    > = {};

    const credentials = await ctx.db
      .query("autopilotAdapterCredentials")
      .withIndex("by_org_adapter", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("adapter", config.adapter)
      )
      .unique();

    const hasValidCreds = credentials?.isValid === true;
    const hasCreds = credentials !== null;

    if (!hasCreds) {
      readiness.dev = {
        ready: false,
        reason: "No credentials configured",
        actionUrl: "settings",
      };
    } else if (!hasValidCreds) {
      readiness.dev = {
        ready: false,
        reason: "Credentials invalid",
        actionUrl: "settings",
      };
    }

    // In the new architecture, agents are proactive:
    // - Growth does market research from day 1 (no prerequisites)
    // - Sales discovers prospects proactively (no need for existing leads)
    // - Only Dev needs credentials to function
    // Readiness now reflects actual blockers, not old prerequisites.

    return readiness;
  },
});
