/**
 * Guards — middleware checks wrapping every role-skill execution.
 *
 * Checks: autonomy mode, cost budget, rate limit, circuit breaker.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { getEffectiveTier } from "../billing/effective_tier";
import { DEFAULT_WEEKLY_COST_CAP_USD } from "./cost_guard";

const MAX_EXECUTIONS_PER_HOUR = 10;
const CIRCUIT_BREAKER_FAILURES = 5;
const CIRCUIT_BREAKER_WINDOW_MS = 10 * 60 * 1000;
const CIRCUIT_BREAKER_COOLDOWN_MS = 30 * 60 * 1000;

const checkCostCaps = (config: {
  costUsedThisWeekUsd?: number;
  costUsedTodayUsd?: number;
  dailyCostCapUsd?: number;
  weeklyCostCapUsd?: number;
}): string | null => {
  const dailyCap = config.dailyCostCapUsd ?? 0;
  if (dailyCap > 0) {
    const costUsed = config.costUsedTodayUsd ?? 0;
    if (costUsed >= dailyCap) {
      return `Daily cost cap reached ($${costUsed.toFixed(2)} / $${dailyCap.toFixed(2)})`;
    }
  }
  const weeklyCap = config.weeklyCostCapUsd ?? DEFAULT_WEEKLY_COST_CAP_USD;
  if (weeklyCap > 0) {
    const weeklyUsed = config.costUsedThisWeekUsd ?? 0;
    if (weeklyUsed >= weeklyCap) {
      return `Weekly cost cap reached ($${weeklyUsed.toFixed(2)} / $${weeklyCap.toFixed(2)})`;
    }
  }
  return null;
};

export const checkGuards = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    role: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    autonomyMode: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      return { allowed: false, reason: "No autopilot config found" };
    }

    // Check autonomy mode (stopped = disabled)
    const autonomyMode = config.autonomyMode ?? "supervised";
    if (!config.enabled) {
      return {
        allowed: false,
        reason: "Autopilot is disabled",
        autonomyMode,
      };
    }

    if (autonomyMode === "stopped") {
      return {
        allowed: false,
        reason: "Autopilot is stopped",
        autonomyMode,
      };
    }

    const tier = await getEffectiveTier(ctx, args.organizationId);
    if (tier !== "pro") {
      return {
        allowed: false,
        reason: "Autopilot requires a Pro subscription.",
        autonomyMode,
      };
    }

    const costCapReason = checkCostCaps(config);
    if (costCapReason) {
      return { allowed: false, reason: costCapReason, autonomyMode };
    }

    // Check task-per-day limit only inside the active counter window.
    if (
      Date.now() < config.tasksResetAt &&
      config.tasksUsedToday >= config.maxTasksPerDay
    ) {
      return {
        allowed: false,
        reason: `Daily task limit reached (${config.tasksUsedToday} / ${config.maxTasksPerDay})`,
        autonomyMode,
      };
    }

    // Rate limit: max executions per hour per role skill
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const roleActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gt("createdAt", oneHourAgo)
      )
      .filter((q) => q.eq(q.field("role"), args.role))
      .collect();

    const roleExecutions = roleActivity.filter(
      (entry) => entry.level === "action"
    );

    if (roleExecutions.length >= MAX_EXECUTIONS_PER_HOUR) {
      return {
        allowed: false,
        reason: `Rate limit: ${args.role} has ${roleExecutions.length} executions in the last hour`,
        autonomyMode,
      };
    }

    // Circuit breaker: 5 failures in 10 min → 30 min cooldown
    const windowStart = now - CIRCUIT_BREAKER_WINDOW_MS;
    const recentErrors = roleActivity.filter(
      (entry) => entry.level === "error" && entry.createdAt > windowStart
    );

    if (recentErrors.length >= CIRCUIT_BREAKER_FAILURES) {
      const lastError = recentErrors[0];
      if (
        lastError &&
        now - lastError.createdAt < CIRCUIT_BREAKER_COOLDOWN_MS
      ) {
        return {
          allowed: false,
          reason: `Circuit breaker: ${args.role} has ${recentErrors.length} errors in ${CIRCUIT_BREAKER_WINDOW_MS / 60_000}min`,
          autonomyMode,
        };
      }
    }

    return { allowed: true, autonomyMode };
  },
});
