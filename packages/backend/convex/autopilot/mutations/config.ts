/**
 * Config mutations — init, update, autonomy mode, credentials.
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  autonomyLevel,
  autonomyMode,
  codingAdapterType,
} from "../schema/validators";
import { requireOrgAdmin } from "./auth";

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
      autonomyMode: "stopped",
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
    adapter: v.optional(codingAdapterType),
    autonomyLevel: v.optional(autonomyLevel),
    maxTasksPerDay: v.optional(v.number()),
    autoMergePRs: v.optional(v.boolean()),
    requireArchitectReview: v.optional(v.boolean()),
    intelligenceEnabled: v.optional(v.boolean()),
    pmEnabled: v.optional(v.boolean()),
    ctoEnabled: v.optional(v.boolean()),
    devEnabled: v.optional(v.boolean()),
    growthEnabled: v.optional(v.boolean()),
    supportEnabled: v.optional(v.boolean()),
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
  },
});

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

    if (args.mode === "stopped" && previousMode !== "stopped") {
      const inProgressItems = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_status", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("status", "in_progress")
        )
        .collect();

      for (const item of inProgressItems) {
        await ctx.db.patch(item._id, {
          status: "backlog",
          updatedAt: now,
        });
      }

      await ctx.db.patch(config._id, {
        autonomyMode: "stopped",
        stoppedAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("autopilotActivityLog", {
        agent: "system",
        createdAt: now,
        level: "warning",
        message: `Autopilot stopped — ${inProgressItems.length} work items paused`,
        organizationId: args.organizationId,
      });
      return;
    }

    if (previousMode === "stopped" && args.mode !== "stopped") {
      const backlogItems = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "backlog")
        )
        .collect();

      for (const item of backlogItems) {
        await ctx.db.patch(item._id, {
          status: "in_progress",
          updatedAt: now,
        });
      }

      await ctx.db.patch(config._id, {
        autonomyMode: args.mode,
        stoppedAt: undefined,
        updatedAt: now,
      });

      await ctx.db.insert("autopilotActivityLog", {
        agent: "system",
        createdAt: now,
        level: "success",
        message: `Autopilot resumed in ${args.mode} mode — ${backlogItems.length} work items resumed`,
        organizationId: args.organizationId,
      });

      // Trigger bootstrap when resuming from stopped
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.onboarding.bootstrapAutopilot,
        { organizationId: config.organizationId }
      );
      return;
    }

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
// A2: Budget cap management
// ============================================

export const raiseBudgetCap = mutation({
  args: {
    organizationId: v.id("organizations"),
    newCapUsd: v.number(),
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

    const now = Date.now();
    await ctx.db.patch(config._id, {
      dailyCostCapUsd: args.newCapUsd,
      updatedAt: now,
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "success",
      message: `Budget cap raised to $${args.newCapUsd.toFixed(2)}`,
      action: "budget.raised",
    });
  },
});

// ============================================
// A6: Routine CRUD
// ============================================

export const createRoutine = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    agent: v.union(
      v.literal("pm"),
      v.literal("cto"),
      v.literal("dev"),
      v.literal("growth"),
      v.literal("orchestrator"),
      v.literal("system"),
      v.literal("support"),
      v.literal("sales")
    ),
    cronExpression: v.string(),
    timezone: v.optional(v.string()),
    taskTemplate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    const now = Date.now();

    return ctx.db.insert("autopilotRoutines", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      agent: args.agent,
      cronExpression: args.cronExpression,
      timezone: args.timezone,
      taskTemplate: args.taskTemplate,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRoutine = mutation({
  args: {
    routineId: v.id("autopilotRoutines"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    cronExpression: v.optional(v.string()),
    timezone: v.optional(v.string()),
    taskTemplate: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    await requireOrgAdmin(ctx, routine.organizationId, user._id);

    const { routineId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(routineId, cleanUpdates);
  },
});

export const deleteRoutine = mutation({
  args: {
    routineId: v.id("autopilotRoutines"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    await requireOrgAdmin(ctx, routine.organizationId, user._id);

    await ctx.db.delete(args.routineId);
  },
});
