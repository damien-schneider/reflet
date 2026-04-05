/**
 * Work item management — create, update, query autopilot work items.
 *
 * Work items form a DAG: PM creates initiatives → CTO breaks them into
 * stories/specs → Dev agent executes tasks → Architect reviews.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  activityLogLevel,
  assignedAgent,
  codingAdapterType,
  priority,
  runStatus,
  workItemStatus,
  workItemType,
} from "./schema/validators";

// ============================================
// INTERNAL QUERIES
// ============================================

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

// ============================================
// INTERNAL MUTATIONS
// ============================================

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
  handler: async (ctx, args) => {
    const now = Date.now();

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const DEFAULT_MAX_PENDING_PER_AGENT = 2;
    const DEFAULT_MAX_PENDING_TOTAL = 5;
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
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      throw new Error(`Work item not found: ${args.taskId}`);
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
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
 * Update a work item's priority (used by CEO coordination).
 */
export const updateTaskPriority = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    priority,
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      return;
    }
    await ctx.db.patch(args.taskId, {
      priority: args.priority,
      updatedAt: Date.now(),
    });
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
  handler: async (ctx, args) => {
    const { runId, ...updates } = args;
    const filtered: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }

    await ctx.db.patch(runId, filtered);
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
  },
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
