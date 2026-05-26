/**
 * Autopilot cost guard — enforces daily and weekly cost caps.
 *
 * Checks the org's accumulated spending against the configured caps
 * before allowing task execution. Resets daily/weekly counters.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_WEEKLY_COST_CAP_USD = 5;

/**
 * Check whether the org has budget remaining for task execution.
 *
 * Returns `true` if the task can proceed, `false` if the cap has been reached.
 */
export const canExecute = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (
      !config?.enabled ||
      (config.autonomyMode ?? "supervised") === "stopped"
    ) {
      return false;
    }

    // Check task-per-day limit
    if (config.tasksUsedToday >= config.maxTasksPerDay) {
      return false;
    }

    // Check daily cost cap (if configured)
    const dailyCap = config.dailyCostCapUsd ?? 0;
    if (dailyCap > 0) {
      const costUsed = config.costUsedTodayUsd ?? 0;
      if (costUsed >= dailyCap) {
        return false;
      }
    }

    const weeklyCap = config.weeklyCostCapUsd ?? DEFAULT_WEEKLY_COST_CAP_USD;
    if (weeklyCap > 0) {
      const weeklyUsed = config.costUsedThisWeekUsd ?? 0;
      if (weeklyUsed >= weeklyCap) {
        return false;
      }
    }

    return true;
  },
});

/**
 * Record cost for a completed task run.
 *
 * Atomically increments the org's daily cost counter.
 */
export const recordCost = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    costUsd: v.number(),
    taskId: v.optional(v.id("autopilotWorkItems")),
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

    const previousCost = config.costUsedTodayUsd ?? 0;
    const newCost = previousCost + args.costUsd;
    const previousWeeklyCost = config.costUsedThisWeekUsd ?? 0;
    const newWeeklyCost = previousWeeklyCost + args.costUsd;

    await ctx.db.patch(config._id, {
      costUsedTodayUsd: newCost,
      costUsedThisWeekUsd: newWeeklyCost,
      updatedAt: Date.now(),
    });

    const dailyCap = config.dailyCostCapUsd ?? 0;
    if (dailyCap > 0 && newCost >= dailyCap) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        role: "system",
        level: "warning",
        message: `Daily cost cap reached ($${newCost.toFixed(2)} / $${dailyCap.toFixed(2)}). Pausing task execution until tomorrow.`,
      });
    }

    const weeklyCap = config.weeklyCostCapUsd ?? DEFAULT_WEEKLY_COST_CAP_USD;
    if (weeklyCap > 0 && newWeeklyCost >= weeklyCap) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        role: "system",
        level: "warning",
        message: `Weekly cost cap reached ($${newWeeklyCost.toFixed(2)} / $${weeklyCap.toFixed(2)}). Pausing task execution until next week.`,
      });
    }

    return null;
  },
});

/**
 * Evaluate budget thresholds after a cost record.
 *
 * Checks soft (warn) and hard (stop) thresholds. Logs warnings via activity log.
 */
export const evaluateBudget = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    role: v.string(),
    costUsd: v.number(),
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

    const dailyCap = config.dailyCostCapUsd ?? 0;
    if (dailyCap <= 0) {
      return null;
    }

    const costUsed = config.costUsedTodayUsd ?? 0;
    const warnPercent = config.budgetWarnPercent ?? 80;
    const warnThreshold = dailyCap * (warnPercent / 100);

    if (costUsed >= warnThreshold && costUsed < dailyCap) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        role: "system",
        level: "warning",
        message: `Budget warning: ${warnPercent}% of daily cap used ($${costUsed.toFixed(2)} / $${dailyCap.toFixed(2)})`,
        action: "budget.warn_threshold",
      });
    }

    if (costUsed >= dailyCap) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        role: "system",
        level: "error",
        message: `Budget cap reached ($${costUsed.toFixed(2)} / $${dailyCap.toFixed(2)}). Role skills paused until counter resets.`,
        action: "budget.cap_reached",
      });
    }

    return null;
  },
});

/**
 * Reset daily cost counters for all orgs.
 *
 * Called by the daily cron. Resets `costUsedTodayUsd` and `tasksUsedToday`.
 */
export const resetDailyCounters = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const configs = await ctx.db.query("autopilotConfig").collect();
    const now = Date.now();

    for (const config of configs) {
      const updates: Record<string, unknown> = {};
      if (now >= config.tasksResetAt) {
        updates.tasksUsedToday = 0;
        updates.costUsedTodayUsd = 0;
        updates.tasksResetAt = now + 24 * 60 * 60 * 1000;
      }
      const weekResetAt = config.weekResetAt ?? 0;
      if (now >= weekResetAt) {
        updates.costUsedThisWeekUsd = 0;
        updates.weekResetAt = now + WEEK_MS;
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = now;
        await ctx.db.patch(config._id, updates);
      }
    }

    return null;
  },
});
