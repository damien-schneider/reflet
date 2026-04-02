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

    if (!config?.enabled) {
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
    taskId: v.id("autopilotTasks"),
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
        taskId: args.taskId,
        agent: "system",
        level: "warning",
        message: `Daily cost cap reached ($${newCost.toFixed(2)} / $${dailyCap.toFixed(2)}). Pausing task execution until tomorrow.`,
      });

      // Create inbox alert
      await ctx.db.insert("autopilotInboxItems", {
        organizationId: args.organizationId,
        type: "revenue_alert",
        title: "Daily cost cap reached",
        summary: `Autopilot has spent $${newCost.toFixed(2)} today, reaching the $${dailyCap.toFixed(2)} daily cap. New tasks will be paused until the counter resets.`,
        status: "pending",
        priority: "high",
        sourceAgent: "system",
        createdAt: Date.now(),
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
