/**
 * Work item mutations — create, update, and manage autopilot work items.
 *
 * Work items form a DAG: PM creates initiatives → CTO breaks them into
 * stories/specs. Code execution is delegated externally (e.g. via GitHub
 * issues), not run from this backend.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import {
  DEFAULT_MAX_PENDING_PER_ROLE,
  DEFAULT_MAX_PENDING_TOTAL,
} from "./config_task_caps";
import {
  activityLogLevel,
  assignedRole,
  priority,
  workItemStatus,
  workItemType,
} from "./schema/validators";

/**
 * Create a new autopilot work item.
 * Enforces per-role and total active caps before insertion.
 */
export const createTask = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    type: v.optional(workItemType),
    priority,
    assignedRole,
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

    const perRoleCap =
      config?.maxPendingTasksPerRole ?? DEFAULT_MAX_PENDING_PER_ROLE;
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
        role: args.assignedRole,
        level: "info",
        message: `Skipped creating work item "${args.title}" — active items at cap (${allActiveItems.length}/${totalCap})`,
        createdAt: now,
      });
      return null;
    }

    const agentActive = allActiveItems.filter(
      (t) => t.assignedRole === args.assignedRole
    ).length;

    if (agentActive >= perRoleCap) {
      await ctx.db.insert("autopilotActivityLog", {
        organizationId: args.organizationId,
        role: args.assignedRole,
        level: "info",
        message: `Skipped creating work item "${args.title}" — role skill "${args.assignedRole}" at cap (${agentActive}/${perRoleCap})`,
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
      assignedRole: args.assignedRole,
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
      role: args.assignedRole,
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
      reviewedAt?: number;
      reviewType?: string | undefined;
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
    if (args.status === "done" && args.needsReview === false) {
      updates.reviewedAt = now;
      updates.reviewType = undefined;
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
      role: item.assignedRole ?? "system",
      level: logLevel,
      message: `Work item ${args.status}: ${item.title}`,
      details: args.errorMessage,
      createdAt: now,
    });

    return null;
  },
});

/**
 * Complete all in_progress work items for a given role skill.
 */
export const completeRoleTasks = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    role: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const roleItems = items.filter((t) => t.assignedRole === args.role);
    const now = Date.now();

    for (const item of roleItems) {
      await ctx.db.patch(item._id, {
        status: "done",
        updatedAt: now,
      });

      await ctx.db.insert("autopilotActivityLog", {
        organizationId: args.organizationId,
        workItemId: item._id,
        role: item.assignedRole ?? "system",
        level: "success",
        message: `Work item completed: ${item.title}`,
        createdAt: now,
      });
    }

    return roleItems.length;
  },
});

/**
 * Complete one checked-out work item for a role skill.
 */
export const completeRoleTask = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    role: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (
      !item ||
      item.assignedRole !== args.role ||
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
      role: item.assignedRole ?? "system",
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
 * Log an activity entry.
 */
export const logActivity = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.optional(v.id("autopilotWorkItems")),
    workItemId: v.optional(v.id("autopilotWorkItems")),
    role: assignedRole,
    targetRole: v.optional(assignedRole),
    level: activityLogLevel,
    message: v.string(),
    details: v.optional(v.string()),
    action: v.optional(v.string()),
    entityType: v.optional(
      v.union(
        v.literal("work_item"),
        v.literal("document"),
        v.literal("knowledge_doc"),
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
      role: args.role,
      targetRole: args.targetRole,
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
