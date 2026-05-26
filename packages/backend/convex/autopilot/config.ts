/**
 * Autopilot configuration — core queries for config and role skills.
 *
 * Mutations live in mutations/config.ts, task cap queries in config_task_caps.ts.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { getEffectiveTier } from "../billing/effective_tier";
import { autonomyLevel, autonomyMode } from "./schema/validators";

// ============================================
// INTERNAL QUERIES
// ============================================

const autopilotConfigValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("autopilotConfig"),
  autonomyLevel,
  autonomyMode: v.optional(autonomyMode),
  budgetHardStop: v.optional(v.boolean()),
  budgetWarnPercent: v.optional(v.number()),
  ceoChatThreadId: v.optional(v.string()),
  chainEnabled: v.optional(v.boolean()),
  costUsedThisWeekUsd: v.optional(v.number()),
  costUsedTodayUsd: v.optional(v.number()),
  createdAt: v.number(),
  ctoEnabled: v.optional(v.boolean()),
  dailyCostCapUsd: v.optional(v.number()),
  weekResetAt: v.optional(v.number()),
  weeklyCostCapUsd: v.optional(v.number()),
  emailBlocklist: v.optional(v.array(v.string())),
  emailDailyLimit: v.optional(v.number()),
  enabled: v.boolean(),
  fullAutoDelay: v.optional(v.number()),
  growthEnabled: v.optional(v.boolean()),
  intelligenceEnabled: v.optional(v.boolean()),
  maxActiveInitiatives: v.optional(v.number()),
  maxActiveStoriesPerInitiative: v.optional(v.number()),
  maxPendingTasksPerRole: v.optional(v.number()),
  maxPendingTasksTotal: v.optional(v.number()),
  maxSignalsPerDay: v.optional(v.number()),
  maxTasksPerDay: v.number(),
  organizationId: v.id("organizations"),
  orgEmailAddress: v.optional(v.string()),
  perRoleDailyCapUsd: v.optional(v.string()),
  pmEnabled: v.optional(v.boolean()),
  requireArchitectReview: v.boolean(),
  salesEnabled: v.optional(v.boolean()),
  stoppedAt: v.optional(v.number()),
  supportEnabled: v.optional(v.boolean()),
  tasksResetAt: v.number(),
  tasksUsedToday: v.number(),
  updatedAt: v.number(),
  validatorWeights: v.optional(
    v.object({
      audienceBreadth: v.number(),
      cost: v.number(),
      devComplexity: v.number(),
      maintainability: v.number(),
      utility: v.number(),
    })
  ),
});

/**
 * Get the autopilot config for an organization.
 */
export const getConfig = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.union(autopilotConfigValidator, v.null()),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return config;
  },
});

/**
 * Check if the daily task throttle has been reached.
 */
export const canDispatchTask = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!isConfigActive(config)) {
      return false;
    }

    // Reset counter if it's a new day
    const now = Date.now();
    if (now > config.tasksResetAt) {
      return true; // Will reset on next dispatch
    }

    return config.tasksUsedToday < config.maxTasksPerDay;
  },
});

/**
 * Check if a specific role skill is enabled for an org.
 */
export const isRoleSkillEnabled = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    role: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!isConfigActive(config)) {
      return false;
    }

    return isRoleSkillEnabledInConfig(args.role, config);
  },
});

/**
 * All role-skill names and their corresponding config fields.
 */
const ROLE_CONFIG_FIELDS = [
  { name: "pm", field: "pmEnabled" },
  { name: "cto", field: "ctoEnabled" },
  { name: "growth", field: "growthEnabled" },
  { name: "support", field: "supportEnabled" },
  { name: "sales", field: "salesEnabled" },
] as const;

function isConfigActive<T extends { autonomyMode?: string; enabled: boolean }>(
  config: T | null
): config is T {
  return Boolean(
    config?.enabled && (config.autonomyMode ?? "supervised") !== "stopped"
  );
}

async function isOrgAutopilotAllowed(
  ctx: Pick<QueryCtx, "db" | "runQuery">,
  organizationId: Id<"organizations">
): Promise<boolean> {
  const tier = await getEffectiveTier(ctx, organizationId);
  return tier === "pro";
}

export function isRoleSkillEnabledInConfig(
  role: string,
  config: {
    ctoEnabled?: boolean;
    growthEnabled?: boolean;
    pmEnabled?: boolean;
    salesEnabled?: boolean;
    supportEnabled?: boolean;
  }
): boolean {
  switch (role) {
    case "pm":
      return config.pmEnabled !== false;
    case "cto":
      return config.ctoEnabled !== false;
    case "growth":
      return config.growthEnabled === true;
    case "support":
      return config.supportEnabled === true;
    case "sales":
      return config.salesEnabled === true;
    default:
      return true;
  }
}

async function fetchEnabledRoleSkills(
  ctx: { db: QueryCtx["db"] },
  organizationId: Id<"organizations">
): Promise<string[]> {
  const config = await ctx.db
    .query("autopilotConfig")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .unique();

  if (!isConfigActive(config)) {
    return [];
  }

  return ROLE_CONFIG_FIELDS.filter(({ name }) =>
    isRoleSkillEnabledInConfig(name, config)
  ).map(({ name }) => name);
}

/**
 * Get the list of currently enabled role skills for an org.
 * Returns an empty array if autopilot is disabled.
 */
export const getEnabledRoleSkills = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    return await fetchEnabledRoleSkills(ctx, args.organizationId);
  },
});

/**
 * Get all enabled org configs — used by heartbeat to iterate organizations.
 */
export const getEnabledConfigs = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      organizationId: v.id("organizations"),
      autonomyMode: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const configs = await ctx.db.query("autopilotConfig").collect();
    const enabledConfigs: Array<{
      autonomyMode?: string;
      organizationId: Id<"organizations">;
    }> = [];

    for (const config of configs) {
      if (!isConfigActive(config)) {
        continue;
      }
      if (!(await isOrgAutopilotAllowed(ctx, config.organizationId))) {
        continue;
      }
      enabledConfigs.push({
        organizationId: config.organizationId,
        autonomyMode: config.autonomyMode,
      });
    }

    return enabledConfigs;
  },
});

/**
 * Get active configs for cleanup-only jobs.
 * Unlike getEnabledConfigs, this intentionally does not require current Pro
 * access because self-healing must cancel stale work after a downgrade.
 */
export const getSelfHealingConfigs = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      organizationId: v.id("organizations"),
      autonomyMode: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const configs = await ctx.db.query("autopilotConfig").collect();
    return configs.filter(isConfigActive).map((config) => ({
      organizationId: config.organizationId,
      autonomyMode: config.autonomyMode,
    }));
  },
});
