/**
 * Work item queries — list, get, children, and runs.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  assignedAgent,
  priority,
  workItemStatus,
  workItemType,
} from "../schema/validators";
import { requireOrgMembership } from "./auth";

export const listWorkItems = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.optional(workItemType),
    status: v.optional(workItemStatus),
    assignedAgent: v.optional(assignedAgent),
    priority: v.optional(priority),
    needsReview: v.optional(v.boolean()),
    isPublicRoadmap: v.optional(v.boolean()),
    parentId: v.optional(v.id("autopilotWorkItems")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 200;

    if (args.isPublicRoadmap !== undefined) {
      const { isPublicRoadmap } = args;
      const items = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_public", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("isPublicRoadmap", isPublicRoadmap)
        )
        .order("desc")
        .take(limit);
      return applyFilters(items, args);
    }

    if (args.needsReview !== undefined) {
      const { needsReview } = args;
      const items = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_review", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("needsReview", needsReview)
        )
        .order("desc")
        .take(limit);
      return applyFilters(items, args);
    }

    if (args.type) {
      const { type } = args;
      const items = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .order("desc")
        .take(limit);
      return applyFilters(items, args);
    }

    if (args.status) {
      const { status } = args;
      const items = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
      return applyFilters(items, args);
    }

    if (args.assignedAgent) {
      const { assignedAgent: agent } = args;
      const items = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_agent", (q) =>
          q.eq("organizationId", args.organizationId).eq("assignedAgent", agent)
        )
        .order("desc")
        .take(limit);
      return applyFilters(items, args);
    }

    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
    return applyFilters(items, args);
  },
});

export const getWorkItem = query({
  args: { workItemId: v.id("autopilotWorkItems") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      return null;
    }

    await requireOrgMembership(ctx, item.organizationId, user._id);
    return item;
  },
});

export const getChildren = query({
  args: { parentId: v.id("autopilotWorkItems") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const parent = await ctx.db.get(args.parentId);
    if (!parent) {
      return [];
    }

    await requireOrgMembership(ctx, parent.organizationId, user._id);

    return ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

export const getWorkItemRuns = query({
  args: { workItemId: v.id("autopilotWorkItems") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      return [];
    }

    await requireOrgMembership(ctx, item.organizationId, user._id);

    return ctx.db
      .query("autopilotRuns")
      .withIndex("by_work_item", (q) => q.eq("workItemId", args.workItemId))
      .collect();
  },
});

interface WorkItemFilter {
  assignedAgent?: string | null;
  parentId?: string | null;
  priority: string;
  status: string;
  type: string;
}

function applyFilters<T extends WorkItemFilter>(
  items: T[],
  filters: {
    type?: string;
    status?: string;
    assignedAgent?: string;
    priority?: string;
    parentId?: string;
  }
): T[] {
  let result = items;

  if (filters.parentId !== undefined) {
    result = result.filter((i) => i.parentId === filters.parentId);
  }

  if (filters.priority) {
    result = result.filter((i) => i.priority === filters.priority);
  }

  return result;
}
