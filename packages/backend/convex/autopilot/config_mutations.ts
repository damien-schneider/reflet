/**
 * Autopilot config mutations and actions —
 * create, update, and credential management.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";
import { getEffectiveTier } from "../billing/effective_tier";
import { DEFAULT_DAILY_COST_CAP_USD } from "./config_task_caps";
import {
  autonomyLevel,
  autonomyMode,
  codingAdapterType,
  isProductionCodingAdapter,
} from "./schema/validators";

const credentialMapSchema = z.record(z.string(), z.string());

type InternalConfigPatch = Partial<
  Pick<
    Doc<"autopilotConfig">,
    | "adapter"
    | "autoMergePRs"
    | "autoMergeThreshold"
    | "autonomyLevel"
    | "autonomyMode"
    | "ctoEnabled"
    | "devEnabled"
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

function parseCredentialMap(
  credentials: string
): Record<string, string> | null {
  try {
    const parsed = credentialMapSchema.safeParse(JSON.parse(credentials));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

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
      devEnabled: false,
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
      dailyCostCapUsd: DEFAULT_DAILY_COST_CAP_USD,
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: InternalConfigPatch = { updatedAt: Date.now() };
    if (args.adapter !== undefined) {
      updates.adapter = args.adapter;
      if (!isProductionCodingAdapter(args.adapter)) {
        updates.devEnabled = false;
      }
    }
    if (args.autonomyLevel !== undefined) {
      updates.autonomyLevel = args.autonomyLevel;
    }
    if (args.maxTasksPerDay !== undefined) {
      updates.maxTasksPerDay = args.maxTasksPerDay;
    }
    if (args.autoMergePRs !== undefined) {
      updates.autoMergePRs = args.autoMergePRs;
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
    if (args.devEnabled !== undefined) {
      updates.devEnabled = args.devEnabled;
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
    if (args.autoMergeThreshold !== undefined) {
      updates.autoMergeThreshold = args.autoMergeThreshold;
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

/**
 * Store or update adapter credentials.
 */
export const upsertAdapterCredentials = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    adapter: codingAdapterType,
    credentials: v.string(),
  },
  returns: v.id("autopilotAdapterCredentials"),
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.credentialId, {
      isValid: args.isValid,
      lastValidatedAt: now,
      updatedAt: now,
    });
    return null;
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
  returns: v.boolean(),
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

    const parsed = parseCredentialMap(creds.credentials);
    const isValid = parsed
      ? await adapterInstance.validateCredentials(parsed)
      : false;

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
