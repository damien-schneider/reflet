/**
 * Work item queries — read-only access to autopilot work items, runs, and activity.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import { workItemStatus } from "./schema/validators";

/**
 * Get an organization by ID (for use by autopilot actions which lack ctx.db).
 */
export const getOrganization = internalQuery({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get all todo work items for an org, ordered by priority.
 */
export const getPendingTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    const priorityOrder = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    } as const;
    return items.sort(
      (a, b) =>
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
    );
  },
});

/**
 * Get work items that are ready to dispatch (todo + not blocked by parent).
 */
export const getDispatchableTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    const dispatchable: Doc<"autopilotWorkItems">[] = [];

    for (const item of todoItems) {
      if (item.parentId) {
        const parent = await ctx.db.get(item.parentId);
        if (parent && parent.status !== "done") {
          continue;
        }
      }
      dispatchable.push(item);
    }

    const priorityOrder = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    } as const;
    return dispatchable.sort(
      (a, b) =>
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
    );
  },
});

/**
 * Get a work item by ID.
 */
export const getTask = internalQuery({
  args: { taskId: v.id("autopilotWorkItems") },
  handler: async (ctx, args) => ctx.db.get(args.taskId),
});

/**
 * Get children for a parent work item.
 */
export const getSubtasks = internalQuery({
  args: { parentTaskId: v.id("autopilotWorkItems") },
  handler: async (ctx, args) =>
    ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentTaskId))
      .collect(),
});

/**
 * Get all work items for an org (for the dashboard).
 */
export const getTasksByOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(workItemStatus),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      const { status } = args;
      return await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();
    }

    return await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

/**
 * Get active runs for a work item.
 */
export const getRunsForTask = internalQuery({
  args: { taskId: v.id("autopilotWorkItems") },
  handler: async (ctx, args) =>
    ctx.db
      .query("autopilotRuns")
      .withIndex("by_work_item", (q) => q.eq("workItemId", args.taskId))
      .collect(),
});

/**
 * Get recent activity for an org (for the live feed).
 */
export const getRecentActivity = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit ?? 50);
  },
});
