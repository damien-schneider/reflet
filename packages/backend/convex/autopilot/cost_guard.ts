/**
 * Autopilot cost guard — enforces daily cost caps.
 *
 * Checks the org's accumulated spending against the configured cap
 * before allowing task execution. Resets daily counters.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";

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

    if (!config || (config.autonomyMode ?? "supervised") === "stopped") {
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
    taskId: v.id("autopilotWorkItems"),
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

    await ctx.db.patch(config._id, {
      costUsedTodayUsd: newCost,
      updatedAt: Date.now(),
    });

    // Check if the cap has been reached after this spend
    const dailyCap = config.dailyCostCapUsd ?? 0;
    if (dailyCap > 0 && newCost >= dailyCap) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message: `Daily cost cap reached ($${newCost.toFixed(2)} / $${dailyCap.toFixed(2)}). Pausing task execution until tomorrow.`,
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
    agent: v.string(),
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
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "warning",
        message: `Budget warning: ${warnPercent}% of daily cap used ($${costUsed.toFixed(2)} / $${dailyCap.toFixed(2)})`,
        action: "budget.warn_threshold",
      });
    }

    if (costUsed >= dailyCap) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "error",
        message: `Budget cap reached ($${costUsed.toFixed(2)} / $${dailyCap.toFixed(2)}). Agents paused until counter resets.`,
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
      if (now >= config.tasksResetAt) {
        await ctx.db.patch(config._id, {
          tasksUsedToday: 0,
          costUsedTodayUsd: 0,
          tasksResetAt: now + 24 * 60 * 60 * 1000,
          updatedAt: now,
        });
      }
    }

    return null;
  },
});
