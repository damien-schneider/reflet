/**
 * Work item lifecycle helpers — checkout, release, and cancel.
 *
 * Code execution adapters were removed; these helpers now only
 * mutate work item state. No external coding provider is contacted.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { assignedAgent } from "./schema/validators";

export const cancelTask = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
    finalStatus: v.optional(
      v.union(v.literal("backlog"), v.literal("cancelled"))
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
      taskId: args.taskId,
    });
    if (!task) {
      return null;
    }
    if (task.organizationId !== args.organizationId) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: task.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message:
          "Cancellation stopped: work item belongs to another organization",
      });
      return null;
    }

    await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId: args.taskId,
      status: args.finalStatus ?? "cancelled",
    });
    return null;
  },
});

export const checkoutTask = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    agent: assignedAgent,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      return false;
    }

    if (item.status !== "todo") {
      return false;
    }

    await ctx.db.patch(args.taskId, {
      status: "in_progress",
      assignedAgent: args.agent,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const releaseTask = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      return null;
    }

    await ctx.db.patch(args.taskId, {
      status: "todo",
      updatedAt: Date.now(),
    });

    return null;
  },
});
