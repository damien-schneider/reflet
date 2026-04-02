/**
 * Public mutations for the Autopilot frontend.
 *
 * All mutations authenticate the user and verify org admin/owner membership.
 * Write operations require admin or owner role.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import {
  autonomyLevel,
  autopilotTaskPriority,
  codingAdapterType,
  growthItemStatus,
  inboxItemStatus,
} from "./tableFields";

// ============================================
// HELPERS
// ============================================

const requireOrgAdmin = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: string
) => {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  if (membership.role !== "admin" && membership.role !== "owner") {
    throw new Error("Admin or owner role required");
  }

  return membership;
};

// ============================================
// CONFIG
// ============================================

export const initConfig = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const existing = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    return ctx.db.insert("autopilotConfig", {
      organizationId: args.organizationId,
      enabled: false,
      adapter: "builtin",
      autonomyLevel: "review_required",
      maxTasksPerDay: 10,
      tasksUsedToday: 0,
      tasksResetAt: now + TWENTY_FOUR_HOURS,
      autoMergePRs: false,
      requireArchitectReview: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateConfig = mutation({
  args: {
    configId: v.id("autopilotConfig"),
    enabled: v.optional(v.boolean()),
    adapter: v.optional(codingAdapterType),
    autonomyLevel: v.optional(autonomyLevel),
    maxTasksPerDay: v.optional(v.number()),
    autoMergePRs: v.optional(v.boolean()),
    requireArchitectReview: v.optional(v.boolean()),
    dailyCostCapUsd: v.optional(v.number()),
    emailDailyLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const config = await ctx.db.get(args.configId);
    if (!config) {
      throw new Error("Config not found");
    }

    await requireOrgAdmin(ctx, config.organizationId, user._id);

    const { configId, ...updates } = args;
    const filtered: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }

    await ctx.db.patch(configId, {
      ...filtered,
      updatedAt: Date.now(),
    });
  },
});

export const emergencyStop = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      throw new Error("Autopilot not configured");
    }

    await ctx.db.patch(config._id, {
      enabled: false,
      updatedAt: Date.now(),
    });

    // Log the emergency stop
    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: Date.now(),
      level: "warning",
      message: "Emergency stop activated — autopilot disabled",
      organizationId: args.organizationId,
    });
  },
});

// ============================================
// CREDENTIALS
// ============================================

export const upsertCredentials = mutation({
  args: {
    organizationId: v.id("organizations"),
    adapter: codingAdapterType,
    credentials: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const existing = await ctx.db
      .query("autopilotAdapterCredentials")
      .withIndex("by_org_adapter", (q) =>
        q.eq("organizationId", args.organizationId).eq("adapter", args.adapter)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        credentials: args.credentials,
        isValid: false,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("autopilotAdapterCredentials", {
      organizationId: args.organizationId,
      adapter: args.adapter,
      credentials: args.credentials,
      isValid: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ============================================
// TASKS
// ============================================

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

// ============================================
// INBOX
// ============================================

export const updateInboxItem = mutation({
  args: {
    itemId: v.id("autopilotInboxItems"),
    status: inboxItemStatus,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Inbox item not found");
    }

    await requireOrgAdmin(ctx, item.organizationId, user._id);

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (
      item.status === "pending" &&
      (args.status === "approved" ||
        args.status === "rejected" ||
        args.status === "snoozed")
    ) {
      updates.reviewedAt = now;
    }

    await ctx.db.patch(args.itemId, updates);

    let logLevel: "success" | "warning" | "action" = "action";
    if (args.status === "approved") {
      logLevel = "success";
    } else if (args.status === "rejected") {
      logLevel = "warning";
    }

    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: now,
      level: logLevel,
      message: `Inbox item ${args.status}: ${item.title}`,
      organizationId: item.organizationId,
    });
  },
});

export const bulkUpdateInbox = mutation({
  args: {
    itemIds: v.array(v.id("autopilotInboxItems")),
    status: inboxItemStatus,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify membership on first item
    if (args.itemIds.length === 0) {
      return;
    }

    const firstItem = await ctx.db.get(args.itemIds[0]);
    if (!firstItem) {
      throw new Error("Inbox item not found");
    }

    await requireOrgAdmin(ctx, firstItem.organizationId, user._id);

    const now = Date.now();

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item) {
        continue;
      }

      const updates: Record<string, unknown> = {
        status: args.status,
      };

      if (item.status === "pending") {
        updates.reviewedAt = now;
      }

      await ctx.db.patch(itemId, updates);
    }

    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: now,
      level: "action",
      message: `Bulk updated ${args.itemIds.length} inbox items to ${args.status}`,
      organizationId: firstItem.organizationId,
    });
  },
});

// ============================================
// GROWTH ITEMS
// ============================================

export const updateGrowthItem = mutation({
  args: {
    itemId: v.id("autopilotGrowthItems"),
    status: growthItemStatus,
    publishedUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Growth item not found");
    }

    await requireOrgAdmin(ctx, item.organizationId, user._id);

    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.status === "published") {
      updates.publishedAt = Date.now();
    }

    if (args.publishedUrl !== undefined) {
      updates.publishedUrl = args.publishedUrl;
    }

    await ctx.db.patch(args.itemId, updates);
  },
});
