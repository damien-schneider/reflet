/**
 * Autopilot config mutations — create/update config and bookkeeping.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { getEffectiveTier } from "../billing/effective_tier";
import { DEFAULT_DAILY_COST_CAP_USD } from "./config_task_caps";
import { autonomyLevel, autonomyMode } from "./schema/validators";

type InternalConfigPatch = Partial<
  Pick<
    Doc<"autopilotConfig">,
    | "autonomyLevel"
    | "autonomyMode"
    | "ctoEnabled"
    | "fullAutoDelay"
    | "growthEnabled"
    | "intelligenceEnabled"
    | "maxPendingTasksPerAgent"
    | "maxPendingTasksTotal"
    | "maxTasksPerDay"
    | "pmEnabled"
    | "requireArchitectReview"
    | "salesEnabled"
    | "supportEnabled"
  >
> & { updatedAt: number };

/**
 * Create default autopilot config for an org.
 */
export const createDefaultConfig = internalMutation({
  args: { organizationId: v.id("organizations") },
  returns: v.id("autopilotConfig"),
  handler: async (ctx, args) => {
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
      intelligenceEnabled: false,
      pmEnabled: true,
      ctoEnabled: true,
      growthEnabled: false,
      supportEnabled: false,
      salesEnabled: false,
      autonomyLevel: "review_required",
      autonomyMode: "stopped",
      fullAutoDelay: 5 * 60 * 1000,
      maxTasksPerDay: 10,
      tasksUsedToday: 0,
      tasksResetAt: now + TWENTY_FOUR_HOURS,
      dailyCostCapUsd: DEFAULT_DAILY_COST_CAP_USD,
      requireArchitectReview: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update autopilot config.
 */
export const updateConfig = internalMutation({
  args: {
    configId: v.id("autopilotConfig"),
    autonomyLevel: v.optional(autonomyLevel),
    maxTasksPerDay: v.optional(v.number()),
    intelligenceEnabled: v.optional(v.boolean()),
    pmEnabled: v.optional(v.boolean()),
    ctoEnabled: v.optional(v.boolean()),
    growthEnabled: v.optional(v.boolean()),
    supportEnabled: v.optional(v.boolean()),
    salesEnabled: v.optional(v.boolean()),
    requireArchitectReview: v.optional(v.boolean()),
    autonomyMode: v.optional(autonomyMode),
    fullAutoDelay: v.optional(v.number()),
    maxPendingTasksPerAgent: v.optional(v.number()),
    maxPendingTasksTotal: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: InternalConfigPatch = { updatedAt: Date.now() };
    if (args.autonomyLevel !== undefined) {
      updates.autonomyLevel = args.autonomyLevel;
    }
    if (args.maxTasksPerDay !== undefined) {
      updates.maxTasksPerDay = args.maxTasksPerDay;
    }
    if (args.intelligenceEnabled !== undefined) {
      updates.intelligenceEnabled = args.intelligenceEnabled;
    }
    if (args.pmEnabled !== undefined) {
      updates.pmEnabled = args.pmEnabled;
    }
    if (args.ctoEnabled !== undefined) {
      updates.ctoEnabled = args.ctoEnabled;
    }
    if (args.growthEnabled !== undefined) {
      updates.growthEnabled = args.growthEnabled;
    }
    if (args.supportEnabled !== undefined) {
      updates.supportEnabled = args.supportEnabled;
    }
    if (args.salesEnabled !== undefined) {
      updates.salesEnabled = args.salesEnabled;
    }
    if (args.requireArchitectReview !== undefined) {
      updates.requireArchitectReview = args.requireArchitectReview;
    }
    if (args.autonomyMode !== undefined) {
      updates.autonomyMode = args.autonomyMode;
    }
    if (args.fullAutoDelay !== undefined) {
      updates.fullAutoDelay = args.fullAutoDelay;
    }
    if (args.maxPendingTasksPerAgent !== undefined) {
      updates.maxPendingTasksPerAgent = args.maxPendingTasksPerAgent;
    }
    if (args.maxPendingTasksTotal !== undefined) {
      updates.maxPendingTasksTotal = args.maxPendingTasksTotal;
    }

    await ctx.db.patch(args.configId, updates);
    return null;
  },
});

/**
 * Increment the daily task counter.
 */
export const incrementTaskCounter = internalMutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      return null;
    }

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    // Reset counter if it's a new day
    if (now > config.tasksResetAt) {
      await ctx.db.patch(config._id, {
        tasksUsedToday: 1,
        tasksResetAt: now + TWENTY_FOUR_HOURS,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(config._id, {
        tasksUsedToday: config.tasksUsedToday + 1,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const reserveTaskExecution = internalMutation({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const tier = await getEffectiveTier(ctx, args.organizationId);
    if (tier !== "pro") {
      return {
        allowed: false,
        reason: "Autopilot requires a Pro subscription.",
      };
    }

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (
      !config?.enabled ||
      (config?.autonomyMode ?? "supervised") === "stopped"
    ) {
      return { allowed: false, reason: "Autopilot is not active" };
    }

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (now > config.tasksResetAt) {
      await ctx.db.patch(config._id, {
        tasksUsedToday: 1,
        tasksResetAt: now + TWENTY_FOUR_HOURS,
        updatedAt: now,
      });
      return { allowed: true };
    }

    if (config.tasksUsedToday >= config.maxTasksPerDay) {
      return {
        allowed: false,
        reason: `Daily task limit reached (${config.tasksUsedToday} / ${config.maxTasksPerDay})`,
      };
    }

    await ctx.db.patch(config._id, {
      tasksUsedToday: config.tasksUsedToday + 1,
      updatedAt: now,
    });
    return { allowed: true };
  },
});
