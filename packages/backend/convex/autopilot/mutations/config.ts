/**
 * Config mutations — init, update, autonomy mode.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { DEFAULT_DAILY_COST_CAP_USD } from "../config_task_caps";
import { autonomyLevel, autonomyMode } from "../schema/validators";
import { requireAutopilotAccess, requireOrgAdmin } from "./auth";

export const initConfig = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.id("autopilotConfig"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

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
      fullAutoDelay: 15 * 60 * 1000,
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

type ConfigPatch = Partial<
  Pick<
    Doc<"autopilotConfig">,
    | "autonomyLevel"
    | "ctoEnabled"
    | "dailyCostCapUsd"
    | "emailDailyLimit"
    | "growthEnabled"
    | "intelligenceEnabled"
    | "maxPendingTasksPerAgent"
    | "maxPendingTasksTotal"
    | "maxTasksPerDay"
    | "perAgentDailyCapUsd"
    | "pmEnabled"
    | "requireArchitectReview"
    | "salesEnabled"
    | "supportEnabled"
  >
> & { updatedAt: number };

interface ConfigUpdateArgs {
  autonomyLevel?: Doc<"autopilotConfig">["autonomyLevel"];
  ctoEnabled?: boolean;
  dailyCostCapUsd?: number;
  emailDailyLimit?: number;
  growthEnabled?: boolean;
  intelligenceEnabled?: boolean;
  maxPendingTasksPerAgent?: number;
  maxPendingTasksTotal?: number;
  maxTasksPerDay?: number;
  perAgentDailyCapUsd?: string;
  pmEnabled?: boolean;
  requireArchitectReview?: boolean;
  salesEnabled?: boolean;
  supportEnabled?: boolean;
}

const perAgentDailyCapUsdSchema = z
  .object({
    cto: z.number().positive().finite().optional(),
    growth: z.number().positive().finite().optional(),
    pm: z.number().positive().finite().optional(),
    sales: z.number().positive().finite().optional(),
    support: z.number().positive().finite().optional(),
  })
  .strict();

function assertAtLeastOne(value: number | undefined, field: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 1)) {
    throw new Error(`${field} must be at least 1`);
  }
}

function assertNonNegative(value: number | undefined, field: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new Error(`${field} must be 0 or greater`);
  }
}

function validateConfigUpdate(args: {
  dailyCostCapUsd?: number;
  emailDailyLimit?: number;
  maxPendingTasksPerAgent?: number;
  maxPendingTasksTotal?: number;
  maxTasksPerDay?: number;
  perAgentDailyCapUsd?: string;
}): void {
  assertAtLeastOne(args.maxTasksPerDay, "maxTasksPerDay");
  assertAtLeastOne(args.maxPendingTasksPerAgent, "maxPendingTasksPerAgent");
  assertAtLeastOne(args.maxPendingTasksTotal, "maxPendingTasksTotal");
  assertNonNegative(args.dailyCostCapUsd, "dailyCostCapUsd");
  assertNonNegative(args.emailDailyLimit, "emailDailyLimit");
  if (args.perAgentDailyCapUsd === undefined) {
    return;
  }
  try {
    perAgentDailyCapUsdSchema.parse(JSON.parse(args.perAgentDailyCapUsd));
  } catch {
    throw new Error(
      "perAgentDailyCapUsd must be a JSON object of positive finite dollar amounts for known agents"
    );
  }
}

function applyGeneralUpdates(
  args: ConfigUpdateArgs,
  updates: ConfigPatch
): void {
  if (args.autonomyLevel !== undefined) {
    updates.autonomyLevel = args.autonomyLevel;
  }
  if (args.requireArchitectReview !== undefined) {
    updates.requireArchitectReview = args.requireArchitectReview;
  }
}

function applyAgentUpdates(args: ConfigUpdateArgs, updates: ConfigPatch): void {
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
}

function applyLimitUpdates(args: ConfigUpdateArgs, updates: ConfigPatch): void {
  if (args.maxTasksPerDay !== undefined) {
    updates.maxTasksPerDay = args.maxTasksPerDay;
  }
  if (args.dailyCostCapUsd !== undefined) {
    updates.dailyCostCapUsd = args.dailyCostCapUsd;
  }
  if (args.emailDailyLimit !== undefined) {
    updates.emailDailyLimit = args.emailDailyLimit;
  }
  if (args.maxPendingTasksPerAgent !== undefined) {
    updates.maxPendingTasksPerAgent = args.maxPendingTasksPerAgent;
  }
  if (args.maxPendingTasksTotal !== undefined) {
    updates.maxPendingTasksTotal = args.maxPendingTasksTotal;
  }
  if (args.perAgentDailyCapUsd !== undefined) {
    updates.perAgentDailyCapUsd = args.perAgentDailyCapUsd;
  }
}

export const updateConfig = mutation({
  args: {
    configId: v.id("autopilotConfig"),
    autonomyLevel: v.optional(autonomyLevel),
    maxTasksPerDay: v.optional(v.number()),
    requireArchitectReview: v.optional(v.boolean()),
    intelligenceEnabled: v.optional(v.boolean()),
    pmEnabled: v.optional(v.boolean()),
    ctoEnabled: v.optional(v.boolean()),
    growthEnabled: v.optional(v.boolean()),
    supportEnabled: v.optional(v.boolean()),
    salesEnabled: v.optional(v.boolean()),
    dailyCostCapUsd: v.optional(v.number()),
    emailDailyLimit: v.optional(v.number()),
    maxPendingTasksPerAgent: v.optional(v.number()),
    maxPendingTasksTotal: v.optional(v.number()),
    perAgentDailyCapUsd: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const config = await ctx.db.get(args.configId);
    if (!config) {
      throw new Error("Config not found");
    }

    await requireOrgAdmin(ctx, config.organizationId, user._id);
    await requireAutopilotAccess(ctx, config.organizationId);
    validateConfigUpdate(args);

    const updates: ConfigPatch = { updatedAt: Date.now() };
    applyGeneralUpdates(args, updates);
    applyAgentUpdates(args, updates);
    applyLimitUpdates(args, updates);

    await ctx.db.patch(args.configId, updates);
    return null;
  },
});

export const setAutonomyMode = mutation({
  args: {
    organizationId: v.id("organizations"),
    mode: autonomyMode,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    if (args.mode !== "stopped") {
      await requireAutopilotAccess(ctx, args.organizationId);
    }

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
        enabled: false,
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
      return null;
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
          status: "todo",
          updatedAt: now,
        });
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
        message: `Autopilot resumed in ${args.mode} mode — ${backlogItems.length} work items resumed`,
        organizationId: args.organizationId,
      });
      return null;
    }

    await ctx.db.patch(config._id, {
      enabled: args.mode !== "stopped",
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
    return null;
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
  returns: v.null(),
  handler: async (ctx, args) => {
    assertNonNegative(args.newCapUsd, "newCapUsd");
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

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

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "success",
      message: `Budget cap raised to $${args.newCapUsd.toFixed(2)}`,
      action: "budget.raised",
    });
    return null;
  },
});
