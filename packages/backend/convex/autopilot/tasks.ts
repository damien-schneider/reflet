/**
 * Task management — create, update, query autopilot tasks.
 *
 * Tasks form a DAG: PM creates tasks → CTO breaks them into subtasks →
 * Dev agent executes → Architect reviews.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  activityLogAgent,
  activityLogLevel,
  assignedAgent,
  autonomyLevel,
  autopilotTaskPriority,
  autopilotTaskStatus,
  codingAdapterType,
  runStatus,
  taskOrigin,
} from "./tableFields";

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
 * Get all pending tasks for an org, ordered by priority.
 */
export const getPendingTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    // Sort by priority: critical > high > medium > low
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return tasks.sort(
      (a, b) =>
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
    );
  },
});

/**
 * Get tasks that are ready to dispatch (pending + not blocked).
 */
export const getDispatchableTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const dispatchable: Doc<"autopilotTasks">[] = [];

    for (const task of pending) {
      // If task has a blocker, check if it's resolved
      if (task.blockedByTaskId) {
        const blocker = await ctx.db.get(task.blockedByTaskId);
        if (blocker && blocker.status !== "completed") {
          continue; // Still blocked
        }
      }
      dispatchable.push(task);
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return dispatchable.sort(
      (a, b) =>
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
    );
  },
});

/**
 * Get a task by ID.
 */
export const getTask = internalQuery({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => ctx.db.get(args.taskId),
});

/**
 * Get subtasks for a parent task.
 */
export const getSubtasks = internalQuery({
  args: { parentTaskId: v.id("autopilotTasks") },
  handler: async (ctx, args) =>
    ctx.db
      .query("autopilotTasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", args.parentTaskId))
      .collect(),
});

/**
 * Get all tasks for an org (for the dashboard).
 */
export const getTasksByOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(autopilotTaskStatus),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      const { status } = args;
      return await ctx.db
        .query("autopilotTasks")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();
    }

    return await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

/**
 * Get active runs for a task.
 */
export const getRunsForTask = internalQuery({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) =>
    ctx.db
      .query("autopilotRuns")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect(),
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Create a new autopilot task.
 */
export const createTask = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    priority: autopilotTaskPriority,
    assignedAgent,
    origin: taskOrigin,
    autonomyLevel,
    parentTaskId: v.optional(v.id("autopilotTasks")),
    blockedByTaskId: v.optional(v.id("autopilotTasks")),
    technicalSpec: v.optional(v.string()),
    acceptanceCriteria: v.optional(v.array(v.string())),
    maxRetries: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("autopilotTasks", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      status: "pending",
      priority: args.priority,
      assignedAgent: args.assignedAgent,
      origin: args.origin,
      autonomyLevel: args.autonomyLevel,
      parentTaskId: args.parentTaskId,
      blockedByTaskId: args.blockedByTaskId,
      technicalSpec: args.technicalSpec,
      acceptanceCriteria: args.acceptanceCriteria,
      retryCount: 0,
      maxRetries: args.maxRetries ?? 3,
      createdAt: now,
    });

    // Log the creation
    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      taskId,
      agent: args.assignedAgent,
      level: "info",
      message: `Task created: ${args.title}`,
      details: `Priority: ${args.priority} | Origin: ${args.origin}`,
      createdAt: now,
    });

    return taskId;
  },
});

/**
 * Update a task's status.
 */
export const updateTaskStatus = internalMutation({
  args: {
    taskId: v.id("autopilotTasks"),
    status: autopilotTaskStatus,
    errorMessage: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.retryCount !== undefined) {
      updates.retryCount = args.retryCount;
    }

    if (args.status === "in_progress" && !task.startedAt) {
      updates.startedAt = now;
    }

    if (
      args.status === "completed" ||
      args.status === "failed" ||
      args.status === "cancelled"
    ) {
      updates.completedAt = now;
    }

    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.prUrl !== undefined) {
      updates.prUrl = args.prUrl;
    }
    if (args.prNumber !== undefined) {
      updates.prNumber = args.prNumber;
    }
    if (args.tokensUsed !== undefined) {
      updates.tokensUsed = args.tokensUsed;
    }
    if (args.estimatedCostUsd !== undefined) {
      updates.estimatedCostUsd = args.estimatedCostUsd;
    }

    await ctx.db.patch(args.taskId, updates);

    let logLevel: "error" | "success" | "action" = "action";
    if (args.status === "failed") {
      logLevel = "error";
    } else if (args.status === "completed") {
      logLevel = "success";
    }

    // Log the status change
    await ctx.db.insert("autopilotActivityLog", {
      organizationId: task.organizationId,
      taskId: args.taskId,
      agent: task.assignedAgent,
      level: logLevel,
      message: `Task ${args.status}: ${task.title}`,
      details: args.errorMessage,
      createdAt: now,
    });
  },
});

/**
 * Update a task's priority (used by CEO coordination).
 */
export const updateTaskPriority = internalMutation({
  args: {
    taskId: v.id("autopilotTasks"),
    priority: autopilotTaskPriority,
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return;
    }
    await ctx.db.patch(args.taskId, { priority: args.priority });
  },
});

/**
 * Create a coding run record.
 */
export const createRun = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotTasks"),
    adapter: codingAdapterType,
  },
  handler: async (ctx, args) => {
    const runId = await ctx.db.insert("autopilotRuns", {
      organizationId: args.organizationId,
      taskId: args.taskId,
      adapter: args.adapter,
      status: "queued",
      tokensUsed: 0,
      estimatedCostUsd: 0,
      startedAt: Date.now(),
    });

    return runId;
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
    taskId: v.optional(v.id("autopilotTasks")),
    runId: v.optional(v.id("autopilotRuns")),
    agent: activityLogAgent,
    level: activityLogLevel,
    message: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      taskId: args.taskId,
      runId: args.runId,
      agent: args.agent,
      level: args.level,
      message: args.message,
      details: args.details,
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
    const entries = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit ?? 50);

    return entries;
  },
});
