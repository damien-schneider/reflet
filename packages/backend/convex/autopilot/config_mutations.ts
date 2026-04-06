/**
 * Autopilot config mutations and actions —
 * create, update, and credential management.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import {
  autonomyLevel,
  autonomyMode,
  codingAdapterType,
} from "./schema/validators";

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
      growthEnabled: false,
      supportEnabled: false,
      salesEnabled: false,
      adapter: "builtin",
      autonomyLevel: "review_required",
      autonomyMode: "stopped",
      autoMergeThreshold: 80,
      fullAutoDelay: 5 * 60 * 1000,
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
    adapter: v.optional(codingAdapterType),
    autonomyLevel: v.optional(autonomyLevel),
    maxTasksPerDay: v.optional(v.number()),
    autoMergePRs: v.optional(v.boolean()),
    intelligenceEnabled: v.optional(v.boolean()),
    pmEnabled: v.optional(v.boolean()),
    ctoEnabled: v.optional(v.boolean()),
    devEnabled: v.optional(v.boolean()),
    growthEnabled: v.optional(v.boolean()),
    supportEnabled: v.optional(v.boolean()),
    salesEnabled: v.optional(v.boolean()),
    requireArchitectReview: v.optional(v.boolean()),
    autonomyMode: v.optional(autonomyMode),
    fullAutoDelay: v.optional(v.number()),
    autoMergeThreshold: v.optional(v.number()),
    maxPendingTasksPerAgent: v.optional(v.number()),
    maxPendingTasksTotal: v.optional(v.number()),
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

    await ctx.runMutation(
      internal.autopilot.config_mutations.markCredentialsValid,
      {
        credentialId: creds._id,
        isValid,
      }
    );

    return isValid;
  },
});
