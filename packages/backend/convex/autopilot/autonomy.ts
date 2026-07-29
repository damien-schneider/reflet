/**
 * Autonomy mode control — pause/resume transitions and stopped-state checks.
 *
 * The impact classification that decides which actions need human approval
 * lives in `gate.ts` (`classifyImpact` + the universal `checkGate`), which is
 * the single source of truth. This module only owns the mode toggle.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import { autonomyMode } from "./schema/validators";

/**
 * Check if the system is in stopped mode for an org.
 * Used by cron handlers for quick short-circuit.
 */
export const isStopped = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return (
      !config?.enabled || (config.autonomyMode ?? "supervised") === "stopped"
    );
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Set the autonomy mode — the main toggle.
 * Handles pause/resume transitions including task status updates.
 */
export const setAutonomyMode = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    mode: autonomyMode,
  },
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

    const previousMode = config.autonomyMode ?? "supervised";
    const now = Date.now();

    // Transitioning TO stopped — pause in-progress work items
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
        await ctx.db.patch(item._id, { status: "backlog", updatedAt: now });
      }

      await ctx.db.patch(config._id, {
        enabled: false,
        autonomyMode: "stopped",
        stoppedAt: now,
        updatedAt: now,
      });

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        role: "system",
        level: "warning",
        message: `Autopilot stopped — ${inProgressItems.length} work items paused`,
      });

      return null;
    }

    // Transitioning FROM stopped — resume backlog work items
    if (previousMode === "stopped" && args.mode !== "stopped") {
      const backlogItems = await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "backlog")
        )
        .collect();

      for (const item of backlogItems) {
        await ctx.db.patch(item._id, { status: "todo", updatedAt: now });
      }

      await ctx.db.patch(config._id, {
        enabled: true,
        autonomyMode: args.mode,
        stoppedAt: undefined,
        updatedAt: now,
      });

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        role: "system",
        level: "success",
        message: `Autopilot resumed in ${args.mode} mode — ${backlogItems.length} work items resumed`,
      });

      return null;
    }

    // Mode switch between supervised/full_auto
    await ctx.db.patch(config._id, {
      enabled: args.mode !== "stopped",
      autonomyMode: args.mode,
      updatedAt: now,
    });

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      role: "system",
      level: "info",
      message: `Autonomy mode changed to ${args.mode}`,
    });

    return null;
  },
});
