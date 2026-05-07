/**
 * Work item mutations — create, update, and manage autopilot work items and runs.
 *
 * Work items form a DAG: PM creates initiatives → CTO breaks them into
 * stories/specs → Dev agent executes tasks → Architect reviews.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import {
  DEFAULT_MAX_PENDING_PER_AGENT,
  DEFAULT_MAX_PENDING_TOTAL,
} from "./config_task_caps";
import {
  activityLogLevel,
  assignedAgent,
  codingAdapterType,
  priority,
  runStatus,
  workItemStatus,
  workItemType,
} from "./schema/validators";

/**
 * Create a new autopilot work item.
 * Enforces per-agent and total active caps before insertion.
 */
export const createTask = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    type: v.optional(workItemType),
    priority,
    assignedAgent,
    parentId: v.optional(v.id("autopilotWorkItems")),
    acceptanceCriteria: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    needsReview: v.optional(v.boolean()),
    reviewType: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  returns: v.union(v.id("autopilotWorkItems"), v.null()),
  handler: async (ctx, args) => {
    const now = Date.now();

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const perAgentCap =
      config?.maxPendingTasksPerAgent ?? DEFAULT_MAX_PENDING_PER_AGENT;
    const totalCap = config?.maxPendingTasksTotal ?? DEFAULT_MAX_PENDING_TOTAL;

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

    const allActiveItems = [...todoItems, ...inProgressItems];

    if (allActiveItems.length >= totalCap) {
      await ctx.db.insert("autopilotActivityLog", {
        organizationId: args.organizationId,
        agent: args.assignedAgent,
        level: "info",
        message: `Skipped creating work item "${args.title}" — active items at cap (${allActiveItems.length}/${totalCap})`,
        createdAt: now,
      });
      return null;
    }

    const agentActive = allActiveItems.filter(
      (t) => t.assignedAgent === args.assignedAgent
    ).length;

    if (agentActive >= perAgentCap) {
      await ctx.db.insert("autopilotActivityLog", {
        organizationId: args.organizationId,
        agent: args.assignedAgent,
        level: "info",
        message: `Skipped creating work item "${args.title}" — agent "${args.assignedAgent}" at cap (${agentActive}/${perAgentCap})`,
        createdAt: now,
      });
      return null;
    }

    const workItemId = await ctx.db.insert("autopilotWorkItems", {
      organizationId: args.organizationId,
      type: args.type ?? "task",
      title: args.title,
      description: args.description,
      status: "todo",
      priority: args.priority,
      assignedAgent: args.assignedAgent,
      parentId: args.parentId,
      acceptanceCriteria: args.acceptanceCriteria,
      tags: args.tags,
      needsReview: args.needsReview ?? false,
      reviewType: args.reviewType,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      workItemId,
      agent: args.assignedAgent,
      level: "info",
      message: `Work item created: ${args.title}`,
      details: `Priority: ${args.priority} | Type: ${args.type ?? "task"}`,
      createdAt: now,
    });

    return workItemId;
  },
});

/**
 * Update a work item's status.
 */
export const updateTaskStatus = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    status: workItemStatus,
    errorMessage: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    branch: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    needsReview: v.optional(v.boolean()),
    reviewType: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      throw new Error(`Work item not found: ${args.taskId}`);
    }

    const now = Date.now();
    const updates: {
      branch?: string;
      needsReview?: boolean;
      prNumber?: number;
      prUrl?: string;
      reviewType?: string;
      status: typeof args.status;
      updatedAt: number;
    } = {
      status: args.status,
      updatedAt: now,
    };

    if (args.prUrl !== undefined) {
      updates.prUrl = args.prUrl;
    }
    if (args.prNumber !== undefined) {
      updates.prNumber = args.prNumber;
    }
    if (args.branch !== undefined) {
      updates.branch = args.branch;
    }
    if (args.needsReview !== undefined) {
      updates.needsReview = args.needsReview;
    }
    if (args.reviewType !== undefined) {
      updates.reviewType = args.reviewType;
    }

    await ctx.db.patch(args.taskId, updates);

    let logLevel: "error" | "success" | "action" = "action";
    if (args.status === "cancelled") {
      logLevel = "error";
    } else if (args.status === "done") {
      logLevel = "success";
    }

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: item.organizationId,
      workItemId: args.taskId,
      agent: item.assignedAgent ?? "system",
      level: logLevel,
      message: `Work item ${args.status}: ${item.title}`,
      details: args.errorMessage,
      createdAt: now,
    });

    return null;
  },
});

/**
 * Complete all in_progress work items for a given agent.
 */
export const completeAgentTasks = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const agentItems = items.filter((t) => t.assignedAgent === args.agent);
    const now = Date.now();

    for (const item of agentItems) {
      await ctx.db.patch(item._id, {
        status: "done",
        updatedAt: now,
      });

      await ctx.db.insert("autopilotActivityLog", {
        organizationId: args.organizationId,
        workItemId: item._id,
        agent: item.assignedAgent ?? "system",
        level: "success",
        message: `Work item completed: ${item.title}`,
        createdAt: now,
      });
    }

    return agentItems.length;
  },
});

/**
 * Complete one checked-out work item for an agent.
 */
export const completeAgentTask = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    agent: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (
      !item ||
      item.assignedAgent !== args.agent ||
      item.status !== "in_progress"
    ) {
      return false;
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      status: "done",
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: item.organizationId,
      workItemId: item._id,
      agent: item.assignedAgent ?? "system",
      level: "success",
      message: `Work item completed: ${item.title}`,
      createdAt: now,
    });

    return true;
  },
});

/**
 * Update a work item's priority (used by CEO coordination).
 */
export const updateTaskPriority = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    priority,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      return null;
    }
    await ctx.db.patch(args.taskId, {
      priority: args.priority,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Create a coding run record.
 */
export const createRun = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
    adapter: codingAdapterType,
  },
  returns: v.id("autopilotRuns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("autopilotRuns", {
      organizationId: args.organizationId,
      workItemId: args.taskId,
      adapter: args.adapter,
      status: "queued",
      tokensUsed: 0,
      estimatedCostUsd: 0,
      startedAt: Date.now(),
    });
  },
});

/**
 * Update a coding run's status and details.
 */
export const updateRun = internalMutation({
  args: {
    runId: v.id("autopilotRuns"),
    status: v.optional(runStatus),
    externalRef: v.optional(v.string()),
    branch: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    ciStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("passed"),
        v.literal("failed")
      )
    ),
    ciFailureLog: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: {
      branch?: string;
      ciFailureLog?: string;
      ciStatus?: "failed" | "passed" | "pending" | "running";
      completedAt?: number;
      errorMessage?: string;
      estimatedCostUsd?: number;
      externalRef?: string;
      prNumber?: number;
      prUrl?: string;
      status?: typeof args.status;
      tokensUsed?: number;
    } = {};

    if (args.status !== undefined) {
      updates.status = args.status;
    }
    if (args.externalRef !== undefined) {
      updates.externalRef = args.externalRef;
    }
    if (args.branch !== undefined) {
      updates.branch = args.branch;
    }
    if (args.prUrl !== undefined) {
      updates.prUrl = args.prUrl;
    }
    if (args.prNumber !== undefined) {
      updates.prNumber = args.prNumber;
    }
    if (args.ciStatus !== undefined) {
      updates.ciStatus = args.ciStatus;
    }
    if (args.ciFailureLog !== undefined) {
      updates.ciFailureLog = args.ciFailureLog;
    }
    if (args.tokensUsed !== undefined) {
      updates.tokensUsed = args.tokensUsed;
    }
    if (args.estimatedCostUsd !== undefined) {
      updates.estimatedCostUsd = args.estimatedCostUsd;
    }
    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.completedAt !== undefined) {
      updates.completedAt = args.completedAt;
    }

    await ctx.db.patch(args.runId, updates);
    return null;
  },
});

/**
 * Log an activity entry.
 */
export const logActivity = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.optional(v.id("autopilotWorkItems")),
    workItemId: v.optional(v.id("autopilotWorkItems")),
    runId: v.optional(v.id("autopilotRuns")),
    agent: assignedAgent,
    targetAgent: v.optional(assignedAgent),
    level: activityLogLevel,
    message: v.string(),
    details: v.optional(v.string()),
    action: v.optional(v.string()),
    entityType: v.optional(
      v.union(
        v.literal("work_item"),
        v.literal("document"),
        v.literal("knowledge_doc"),
        v.literal("run"),
        v.literal("lead"),
        v.literal("competitor")
      )
    ),
    entityId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      workItemId: args.workItemId ?? args.taskId,
      runId: args.runId,
      agent: args.agent,
      targetAgent: args.targetAgent,
      level: args.level,
      message: args.message,
      details: args.details,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      createdAt: Date.now(),
    });
    return null;
  },
});
