/**
 * Autopilot config mutations — create/update config and bookkeeping.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
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
    | "maxPendingTasksPerRole"
    | "maxPendingTasksTotal"
    | "maxTasksPerDay"
    | "pmEnabled"
    | "requireArchitectReview"
    | "salesEnabled"
    | "supportEnabled"
  >
> & { updatedAt: number };

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
    maxPendingTasksPerRole: v.optional(v.number()),
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
    if (args.maxPendingTasksPerRole !== undefined) {
      updates.maxPendingTasksPerRole = args.maxPendingTasksPerRole;
    }
    if (args.maxPendingTasksTotal !== undefined) {
      updates.maxPendingTasksTotal = args.maxPendingTasksTotal;
    }

    await ctx.db.patch(args.configId, updates);
    return null;
  },
});
