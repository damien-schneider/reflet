import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import {
  autopilotExecutionActionKind,
  autopilotExecutionTriggerReason,
  chainNodeKind,
  roleSkill,
} from "../schema/validators";
import { executeRuntimeAction } from "./executor";
import { resolveExecutionRetryDelayMs } from "./policy";

const DEFAULT_MAX_RETRIES = 2;

const executionRecord = v.object({
  _id: v.id("autopilotExecutions"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  role: roleSkill,
  status: v.union(
    v.literal("queued"),
    v.literal("running"),
    v.literal("succeeded"),
    v.literal("failed"),
    v.literal("blocked")
  ),
  triggerReason: autopilotExecutionTriggerReason,
  actionKind: autopilotExecutionActionKind,
  title: v.string(),
  chainNode: v.optional(chainNodeKind),
  workItemId: v.optional(v.id("autopilotWorkItems")),
  branch: v.optional(v.string()),
  blockerKind: v.optional(v.string()),
  blockerMessage: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  retryCount: v.number(),
  maxRetries: v.number(),
  nextRetryAt: v.optional(v.number()),
  queuedAt: v.number(),
  startedAt: v.optional(v.number()),
  finishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const queueExecution = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    role: roleSkill,
    triggerReason: autopilotExecutionTriggerReason,
    actionKind: autopilotExecutionActionKind,
    title: v.string(),
    chainNode: v.optional(chainNodeKind),
    workItemId: v.optional(v.id("autopilotWorkItems")),
    branch: v.optional(v.string()),
    maxRetries: v.optional(v.number()),
  },
  returns: v.id("autopilotExecutions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotExecutions", {
      organizationId: args.organizationId,
      role: args.role,
      triggerReason: args.triggerReason,
      actionKind: args.actionKind,
      title: args.title,
      chainNode: args.chainNode,
      workItemId: args.workItemId,
      branch: args.branch,
      status: "queued",
      retryCount: 0,
      maxRetries: args.maxRetries ?? DEFAULT_MAX_RETRIES,
      queuedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getExecution = internalQuery({
  args: { executionId: v.id("autopilotExecutions") },
  returns: v.union(executionRecord, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.executionId),
});

export const hasOpenExecutionForRole = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    role: roleSkill,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const queued = await ctx.db
      .query("autopilotExecutions")
      .withIndex("by_org_role_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("role", args.role)
          .eq("status", "queued")
      )
      .take(1);
    if (queued.length > 0) {
      return true;
    }
    const running = await ctx.db
      .query("autopilotExecutions")
      .withIndex("by_org_role_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("role", args.role)
          .eq("status", "running")
      )
      .take(1);
    return running.length > 0;
  },
});

export const markRunning = internalMutation({
  args: { executionId: v.id("autopilotExecutions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.executionId, {
      status: "running",
      startedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const markSucceeded = internalMutation({
  args: { executionId: v.id("autopilotExecutions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.executionId, {
      status: "succeeded",
      finishedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const markBlocked = internalMutation({
  args: {
    executionId: v.id("autopilotExecutions"),
    blockerKind: v.string(),
    blockerMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.executionId, {
      status: "blocked",
      blockerKind: args.blockerKind,
      blockerMessage: args.blockerMessage,
      finishedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: {
    executionId: v.id("autopilotExecutions"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      return null;
    }
    const now = Date.now();
    const retryCount = execution.retryCount + 1;
    const retryDelayMs = resolveExecutionRetryDelayMs({
      maxRetries: execution.maxRetries,
      retryCount: execution.retryCount,
    });
    await ctx.db.patch(args.executionId, {
      status: "failed",
      errorMessage: args.errorMessage,
      retryCount,
      nextRetryAt: retryDelayMs === null ? undefined : now + retryDelayMs,
      finishedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const runExecutionFromRecord = internalAction({
  args: { executionId: v.id("autopilotExecutions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const execution = await ctx.runQuery(
      internal.autopilot.runtime.lifecycle.getExecution,
      { executionId: args.executionId }
    );
    if (!execution) {
      return null;
    }
    await ctx.runMutation(internal.autopilot.runtime.lifecycle.markRunning, {
      executionId: args.executionId,
    });
    try {
      await executeRuntimeAction(ctx, execution);
      const updated = await ctx.runQuery(
        internal.autopilot.runtime.lifecycle.getExecution,
        { executionId: args.executionId }
      );
      if (updated?.status === "running") {
        await ctx.runMutation(
          internal.autopilot.runtime.lifecycle.markSucceeded,
          { executionId: args.executionId }
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.autopilot.runtime.lifecycle.markFailed, {
        executionId: args.executionId,
        errorMessage: message,
      });
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: execution.organizationId,
        role: execution.role,
        level: "error",
        message: `${execution.title} failed`,
        details: message,
      });
    }
    return null;
  },
});
