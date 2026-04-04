/**
 * Task mutations — create, cancel, retry.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { autopilotTaskPriority } from "../schema/validators";
import { requireOrgAdmin } from "./auth";

export const createTask = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    priority: autopilotTaskPriority,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const now = Date.now();
    const taskId = await ctx.db.insert("autopilotTasks", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      status: "pending",
      priority: args.priority,
      assignedAgent: "pm",
      origin: "user_created",
      autonomyLevel: "review_required",
      retryCount: 0,
      maxRetries: 3,
      createdAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      taskId,
      agent: "system",
      level: "info",
      message: `User created task: ${args.title}`,
      details: `Priority: ${args.priority}`,
      createdAt: now,
    });

    return taskId;
  },
});

export const cancelTask = mutation({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    await requireOrgAdmin(ctx, task.organizationId, user._id);

    await ctx.db.patch(args.taskId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: task.organizationId,
      taskId: args.taskId,
      agent: "system",
      level: "warning",
      message: `Task cancelled: ${task.title}`,
      createdAt: Date.now(),
    });
  },
});

export const retryTask = mutation({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    await requireOrgAdmin(ctx, task.organizationId, user._id);

    if (task.status !== "failed" && task.status !== "cancelled") {
      throw new Error("Only failed or cancelled tasks can be retried");
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      status: "pending",
      errorMessage: undefined,
      startedAt: undefined,
      completedAt: undefined,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: task.organizationId,
      taskId: args.taskId,
      agent: "system",
      level: "info",
      message: `Task retried: ${task.title}`,
      createdAt: now,
    });
  },
});
