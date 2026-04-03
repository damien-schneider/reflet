/**
 * Autopilot configuration — user-facing queries and mutations.
 *
 * Manages per-org autopilot settings, adapter selection,
 * and credential storage.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server";
import { autonomyLevel, autonomyMode, codingAdapterType } from "./tableFields";

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
      securityEnabled: v.optional(v.boolean()),
      architectEnabled: v.optional(v.boolean()),
      growthEnabled: v.optional(v.boolean()),
      supportEnabled: v.optional(v.boolean()),
      analyticsEnabled: v.optional(v.boolean()),
      docsEnabled: v.optional(v.boolean()),
      qaEnabled: v.optional(v.boolean()),
      opsEnabled: v.optional(v.boolean()),
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

    if (!config?.enabled) {
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

    if (!config?.enabled) {
      return false;
    }

    switch (args.agent) {
      case "pm":
        return config.pmEnabled !== false;
      case "cto":
        return config.ctoEnabled !== false;
      case "dev":
        return config.devEnabled !== false;
      case "security":
        return config.securityEnabled !== false;
      case "architect":
        return config.architectEnabled !== false;
      case "growth":
        return config.growthEnabled !== false;
      case "support":
        return config.supportEnabled !== false;
      case "analytics":
        return config.analyticsEnabled !== false;
      case "docs":
        return config.docsEnabled !== false;
      case "qa":
        return config.qaEnabled !== false;
      case "ops":
        return config.opsEnabled !== false;
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
  { name: "security", field: "securityEnabled" },
  { name: "architect", field: "architectEnabled" },
  { name: "growth", field: "growthEnabled" },
  { name: "support", field: "supportEnabled" },
  { name: "analytics", field: "analyticsEnabled" },
  { name: "docs", field: "docsEnabled" },
  { name: "qa", field: "qaEnabled" },
  { name: "ops", field: "opsEnabled" },
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

  if (!config?.enabled) {
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
 * Get orphaned tasks — tasks assigned to currently disabled agents.
 */
export const getOrphanedTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotTasks"),
      title: v.string(),
      assignedAgent: v.string(),
      status: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const enabledAgents = await fetchEnabledAgents(ctx, args.organizationId);

    const pendingTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const inProgressTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const allActiveTasks = [...pendingTasks, ...inProgressTasks];
    const enabledSet = new Set(enabledAgents);

    return allActiveTasks
      .filter((t) => !enabledSet.has(t.assignedAgent))
      .map((t) => ({
        _id: t._id,
        title: t.title,
        assignedAgent: t.assignedAgent,
        status: t.status,
        createdAt: t.createdAt,
      }));
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Create default autopilot config for an org.
 */
export const createDefaultConfig = internalMutation({
  args: { organizationId: v.id("organizations") },
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
      devEnabled: true,
      securityEnabled: true,
      architectEnabled: true,
      growthEnabled: false,
      supportEnabled: false,
      analyticsEnabled: false,
      docsEnabled: false,
      qaEnabled: false,
      opsEnabled: false,
      salesEnabled: false,
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

/**
 * Update autopilot config.
 */
export const updateConfig = internalMutation({
  args: {
    configId: v.id("autopilotConfig"),
    enabled: v.optional(v.boolean()),
    adapter: v.optional(codingAdapterType),
    autonomyLevel: v.optional(autonomyLevel),
    maxTasksPerDay: v.optional(v.number()),
    autoMergePRs: v.optional(v.boolean()),
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
    requireArchitectReview: v.optional(v.boolean()),
    autonomyMode: v.optional(autonomyMode),
    fullAutoDelay: v.optional(v.number()),
    autoMergeThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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

/**
 * Increment the daily task counter.
 */
export const incrementTaskCounter = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      return;
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
  },
});

/**
 * Store or update adapter credentials.
 */
export const upsertAdapterCredentials = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    adapter: codingAdapterType,
    credentials: v.string(),
  },
  handler: async (ctx, args) => {
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
        isValid: false, // Will be validated by the action
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

/**
 * Mark credentials as validated.
 */
export const markCredentialsValid = internalMutation({
  args: {
    credentialId: v.id("autopilotAdapterCredentials"),
    isValid: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.credentialId, {
      isValid: args.isValid,
      lastValidatedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// INTERNAL ACTIONS
// ============================================

/**
 * Validate adapter credentials by calling the adapter's validateCredentials.
 */
export const validateAdapterCredentials = internalAction({
  args: {
    organizationId: v.id("organizations"),
    adapter: codingAdapterType,
  },
  handler: async (ctx, args) => {
    const creds = await ctx.runQuery(
      internal.autopilot.config.getAdapterCredentials,
      { organizationId: args.organizationId, adapter: args.adapter }
    );

    if (!creds) {
      throw new Error("No credentials found for this adapter");
    }

    const { getAdapter } = await import("./adapters/registry");
    const adapterInstance = getAdapter(args.adapter);

    const parsed = JSON.parse(creds.credentials) as Record<string, string>;
    const isValid = await adapterInstance.validateCredentials(parsed);

    await ctx.runMutation(internal.autopilot.config.markCredentialsValid, {
      credentialId: creds._id,
      isValid,
    });

    return isValid;
  },
});
