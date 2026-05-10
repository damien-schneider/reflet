/**
 * Autopilot configuration — core queries for config, agents, and credentials.
 *
 * Mutations live in config_mutations.ts, task cap queries in config_task_caps.ts.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { getEffectiveTier } from "../billing/effective_tier";
import {
  autonomyLevel,
  autonomyMode,
  codingAdapterType,
  isProductionCodingAdapter,
} from "./schema/validators";

// ============================================
// INTERNAL QUERIES
// ============================================

const autopilotConfigValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("autopilotConfig"),
  activationOverrides: v.optional(v.string()),
  adapter: codingAdapterType,
  autoMergePRs: v.boolean(),
  autoMergeThreshold: v.optional(v.number()),
  autonomyLevel,
  autonomyMode: v.optional(autonomyMode),
  budgetHardStop: v.optional(v.boolean()),
  budgetWarnPercent: v.optional(v.number()),
  ceoChatThreadId: v.optional(v.string()),
  chainEnabled: v.optional(v.boolean()),
  costUsedTodayUsd: v.optional(v.number()),
  createdAt: v.number(),
  ctoEnabled: v.optional(v.boolean()),
  dailyCostCapUsd: v.optional(v.number()),
  devEnabled: v.optional(v.boolean()),
  emailBlocklist: v.optional(v.array(v.string())),
  emailDailyLimit: v.optional(v.number()),
  enabled: v.boolean(),
  fullAutoDelay: v.optional(v.number()),
  growthEnabled: v.optional(v.boolean()),
  intelligenceEnabled: v.optional(v.boolean()),
  maxActiveInitiatives: v.optional(v.number()),
  maxActiveStoriesPerInitiative: v.optional(v.number()),
  maxPendingTasksPerAgent: v.optional(v.number()),
  maxPendingTasksTotal: v.optional(v.number()),
  maxSignalsPerDay: v.optional(v.number()),
  maxTasksPerDay: v.number(),
  organizationId: v.id("organizations"),
  orgEmailAddress: v.optional(v.string()),
  perAgentDailyCapUsd: v.optional(v.string()),
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
  wakeThresholdOpenTasks: v.optional(v.number()),
});

const adapterCredentialsValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("autopilotAdapterCredentials"),
  adapter: codingAdapterType,
  createdAt: v.number(),
  credentials: v.string(),
  isValid: v.boolean(),
  lastValidatedAt: v.optional(v.number()),
  organizationId: v.id("organizations"),
  updatedAt: v.number(),
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
 * Get adapter credentials for an org + adapter combination.
 */
export const getAdapterCredentials = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    adapter: codingAdapterType,
  },
  returns: v.union(adapterCredentialsValidator, v.null()),
  handler: async (ctx, args) => {
    const creds = await ctx.db
      .query("autopilotAdapterCredentials")
      .withIndex("by_org_adapter", (q) =>
        q.eq("organizationId", args.organizationId).eq("adapter", args.adapter)
      )
      .unique();

    return creds;
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
 * Check if a specific agent is enabled for an org.
 */
export const isAgentEnabled = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
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

    return isAgentEnabledInConfig(args.agent, config);
  },
});

/**
 * All agent names and their corresponding config fields.
 */
const AGENT_CONFIG_FIELDS = [
  { name: "pm", field: "pmEnabled" },
  { name: "cto", field: "ctoEnabled" },
  { name: "dev", field: "devEnabled" },
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

export function isAgentEnabledInConfig(
  agent: string,
  config: {
    adapter?: string;
    ctoEnabled?: boolean;
    devEnabled?: boolean;
    growthEnabled?: boolean;
    pmEnabled?: boolean;
    salesEnabled?: boolean;
    supportEnabled?: boolean;
  }
): boolean {
  switch (agent) {
    case "pm":
      return config.pmEnabled !== false;
    case "cto":
      return config.ctoEnabled !== false;
    case "dev":
      return (
        isProductionCodingAdapter(config.adapter ?? "builtin") &&
        config.devEnabled === true
      );
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

async function fetchEnabledAgents(
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

  return AGENT_CONFIG_FIELDS.filter(({ name }) =>
    isAgentEnabledInConfig(name, config)
  ).map(({ name }) => name);
}

/**
 * Get the list of currently enabled agent names for an org.
 * Returns an empty array if autopilot is disabled.
 */
export const getEnabledAgents = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    return await fetchEnabledAgents(ctx, args.organizationId);
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
