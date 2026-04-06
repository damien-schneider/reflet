/**
 * Autopilot configuration — core queries for config, agents, and credentials.
 *
 * Mutations live in config_mutations.ts, task cap queries in config_task_caps.ts.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import {
  autonomyLevel,
  autonomyMode,
  codingAdapterType,
} from "./schema/validators";

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get the autopilot config for an organization.
 */
export const getConfig = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("autopilotConfig"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      enabled: v.boolean(),
      intelligenceEnabled: v.optional(v.boolean()),
      pmEnabled: v.optional(v.boolean()),
      ctoEnabled: v.optional(v.boolean()),
      devEnabled: v.optional(v.boolean()),
      growthEnabled: v.optional(v.boolean()),
      supportEnabled: v.optional(v.boolean()),
      salesEnabled: v.optional(v.boolean()),
      adapter: codingAdapterType,
      autonomyLevel,
      maxTasksPerDay: v.number(),
      tasksUsedToday: v.number(),
      tasksResetAt: v.number(),
      autoMergePRs: v.boolean(),
      requireArchitectReview: v.boolean(),
      autonomyMode: v.optional(autonomyMode),
      stoppedAt: v.optional(v.number()),
      fullAutoDelay: v.optional(v.number()),
      autoMergeThreshold: v.optional(v.number()),
      maxPendingTasksPerAgent: v.optional(v.number()),
      maxPendingTasksTotal: v.optional(v.number()),
      ceoChatThreadId: v.optional(v.string()),
      costUsedTodayUsd: v.optional(v.number()),
      dailyCostCapUsd: v.optional(v.number()),
      emailBlocklist: v.optional(v.array(v.string())),
      emailDailyLimit: v.optional(v.number()),
      orgEmailAddress: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
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
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config || (config.autonomyMode ?? "supervised") === "stopped") {
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
 * Returns true if the agent's flag is explicitly true, OR
 * if the flag doesn't exist (backwards compat — agents default to enabled).
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

    if (!config || (config.autonomyMode ?? "supervised") === "stopped") {
      return false;
    }

    switch (args.agent) {
      case "pm":
        return config.pmEnabled !== false;
      case "cto":
        return config.ctoEnabled !== false;
      case "dev":
        return config.devEnabled !== false;
      case "growth":
        return config.growthEnabled !== false;
      case "support":
        return config.supportEnabled !== false;
      case "sales":
        return config.salesEnabled !== false;
      default:
        return true;
    }
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

async function fetchEnabledAgents(
  ctx: { db: QueryCtx["db"] },
  organizationId: Id<"organizations">
): Promise<string[]> {
  const config = await ctx.db
    .query("autopilotConfig")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .unique();

  if (!config || (config.autonomyMode ?? "supervised") === "stopped") {
    return [];
  }

  return AGENT_CONFIG_FIELDS.filter(
    ({ field }) =>
      (config[field as keyof typeof config] as boolean | undefined) !== false
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
    return configs
      .filter((c) => (c.autonomyMode ?? "supervised") !== "stopped")
      .map((c) => ({
        organizationId: c.organizationId,
        autonomyMode: c.autonomyMode,
      }));
  },
});
