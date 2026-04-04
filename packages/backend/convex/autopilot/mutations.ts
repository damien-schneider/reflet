/**
 * Public mutations for the Autopilot frontend.
 *
 * All mutations authenticate the user and verify org admin/owner membership.
 * Write operations require admin or owner role.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import {
  autonomyLevel,
  autonomyMode,
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
      autonomyMode: "supervised",
      autoMergeThreshold: 80,
      fullAutoDelay: 15 * 60 * 1000,
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
    intelligenceEnabled: v.optional(v.boolean()),
    pmEnabled: v.optional(v.boolean()),
    ctoEnabled: v.optional(v.boolean()),
    devEnabled: v.optional(v.boolean()),
    securityEnabled: v.optional(v.boolean()),
    architectEnabled: v.optional(v.boolean()),
    growthEnabled: v.optional(v.boolean()),
    supportEnabled: v.optional(v.boolean()),
    analyticsEnabled: v.optional(v.boolean()),
    docsEnabled: v.optional(v.boolean()),
    qaEnabled: v.optional(v.boolean()),
    opsEnabled: v.optional(v.boolean()),
    salesEnabled: v.optional(v.boolean()),
    dailyCostCapUsd: v.optional(v.number()),
    emailDailyLimit: v.optional(v.number()),
    maxPendingTasksPerAgent: v.optional(v.number()),
    maxPendingTasksTotal: v.optional(v.number()),
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

    // Detect enabled: false → true transition → bootstrap
    const wasEnabled = config.enabled;
    const isNowEnabled = args.enabled;
    if (!wasEnabled && isNowEnabled) {
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.onboarding.bootstrapAutopilot,
        { organizationId: config.organizationId }
      );
    }
  },
});

/**
 * V6: Set the autonomy mode — the main toggle.
 * supervised / full_auto / stopped
 */
export const setAutonomyMode = mutation({
  args: {
    organizationId: v.id("organizations"),
    mode: autonomyMode,
  },
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

    const previousMode = config.autonomyMode ?? "supervised";
    const now = Date.now();

    // Transitioning TO stopped — pause tasks and disable autopilot
    if (args.mode === "stopped" && previousMode !== "stopped") {
      const inProgressTasks = await ctx.db
        .query("autopilotTasks")
        .withIndex("by_org_status", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("status", "in_progress")
        )
        .collect();

      for (const task of inProgressTasks) {
        await ctx.db.patch(task._id, { status: "paused" });
      }

      await ctx.db.patch(config._id, {
        enabled: false,
        autonomyMode: "stopped",
        stoppedAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("autopilotActivityLog", {
        agent: "system",
        createdAt: now,
        level: "warning",
        message: `Autopilot stopped — ${inProgressTasks.length} tasks paused`,
        organizationId: args.organizationId,
      });
      return;
    }

    // Transitioning FROM stopped — resume tasks
    if (previousMode === "stopped" && args.mode !== "stopped") {
      const pausedTasks = await ctx.db
        .query("autopilotTasks")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "paused")
        )
        .collect();

      for (const task of pausedTasks) {
        await ctx.db.patch(task._id, { status: "in_progress" });
      }

      await ctx.db.patch(config._id, {
        enabled: true,
        autonomyMode: args.mode,
        stoppedAt: undefined,
        updatedAt: now,
      });

      await ctx.db.insert("autopilotActivityLog", {
        agent: "system",
        createdAt: now,
        level: "success",
        message: `Autopilot resumed in ${args.mode} mode — ${pausedTasks.length} tasks resumed`,
        organizationId: args.organizationId,
      });
      return;
    }

    // Mode switch between supervised/full_auto
    await ctx.db.patch(config._id, {
      autonomyMode: args.mode,
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: now,
      level: "info",
      message: `Autonomy mode changed to ${args.mode}`,
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

    // Record feedback for agent learning
    if (args.status === "approved" || args.status === "rejected") {
      await ctx.db.insert("autopilotFeedbackLog", {
        organizationId: item.organizationId,
        inboxItemId: args.itemId,
        agent: item.sourceAgent,
        itemType: item.type,
        decision: args.status,
        createdAt: now,
      });
    }
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
