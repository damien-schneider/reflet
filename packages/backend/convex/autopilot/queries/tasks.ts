/**
 * Task queries — list, get, subtasks, and runs.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { autopilotTaskStatus } from "../schema/validators";
import { requireOrgMembership } from "./auth";

export const listTasks = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(autopilotTaskStatus),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    if (args.status) {
      const status = args.status;
      return ctx.db
        .query("autopilotTasks")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();
    }

    return ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const getTask = query({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }

    await requireOrgMembership(ctx, task.organizationId, user._id);
    return task;
  },
});

export const getSubtasks = query({
  args: { parentTaskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const parent = await ctx.db.get(args.parentTaskId);
    if (!parent) {
      return [];
    }

    await requireOrgMembership(ctx, parent.organizationId, user._id);

    return ctx.db
      .query("autopilotTasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", args.parentTaskId))
      .collect();
  },
});

export const getTaskRuns = query({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return [];
    }

    await requireOrgMembership(ctx, task.organizationId, user._id);

    return ctx.db
      .query("autopilotRuns")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});
