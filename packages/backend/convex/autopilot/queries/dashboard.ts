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

    return {
      enabled: (config?.autonomyMode ?? "supervised") !== "stopped",
      adapter: config?.adapter ?? "builtin",
      autonomyLevel: config?.autonomyLevel ?? "review_required",
      autonomyMode: config?.autonomyMode ?? "supervised",
      tasksUsedToday: config?.tasksUsedToday ?? 0,
      maxTasksPerDay: config?.maxTasksPerDay ?? 10,
      costUsedTodayUsd: config?.costUsedTodayUsd ?? 0,
      dailyCostCapUsd: config?.dailyCostCapUsd,
      todoCount: todoItems.length,
      inProgressCount: inProgressItems.length,
      doneCount: doneItems.length,
      pendingReviewCount: pendingReviewItems.length + pendingReviewDocs.length,
      itemsByAgent: Object.fromEntries(
        [...todoItems, ...inProgressItems].reduce((acc, item) => {
          const agent = item.assignedAgent ?? "unassigned";
          acc.set(agent, (acc.get(agent) ?? 0) + 1);
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

    return readiness;
  },
});
