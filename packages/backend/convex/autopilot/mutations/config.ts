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
    securityEnabled: v.optional(v.boolean()),
    architectEnabled: v.optional(v.boolean()),
    growthEnabled: v.optional(v.boolean()),
    supportEnabled: v.optional(v.boolean()),
    docsEnabled: v.optional(v.boolean()),
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
