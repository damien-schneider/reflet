/**
 * Guards — middleware checks wrapping every agent execution.
 *
 * Checks: autonomy mode, cost budget, rate limit, circuit breaker.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

const MAX_EXECUTIONS_PER_HOUR = 10;
const CIRCUIT_BREAKER_FAILURES = 5;
const CIRCUIT_BREAKER_WINDOW_MS = 10 * 60 * 1000;
const CIRCUIT_BREAKER_COOLDOWN_MS = 30 * 60 * 1000;

export const checkGuards = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
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
    if (autonomyMode === "stopped") {
      return {
        allowed: false,
        reason: "Autopilot is stopped",
        autonomyMode,
      };
    }

    // Check daily cost cap
    const dailyCap = config.dailyCostCapUsd ?? 0;
    if (dailyCap > 0) {
      const costUsed = config.costUsedTodayUsd ?? 0;
      if (costUsed >= dailyCap) {
        return {
          allowed: false,
          reason: `Daily cost cap reached ($${costUsed.toFixed(2)} / $${dailyCap.toFixed(2)})`,
          autonomyMode,
        };
      }
    }

    // Check task-per-day limit
    if (config.tasksUsedToday >= config.maxTasksPerDay) {
      return {
        allowed: false,
        reason: `Daily task limit reached (${config.tasksUsedToday} / ${config.maxTasksPerDay})`,
        autonomyMode,
      };
    }

    // Rate limit: max executions per hour per agent
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);

    const agentExecutions = recentActivity.filter(
      (a) =>
        a.agent === args.agent &&
        a.level === "action" &&
        a.createdAt > oneHourAgo
    );

    if (agentExecutions.length >= MAX_EXECUTIONS_PER_HOUR) {
      return {
        allowed: false,
        reason: `Rate limit: ${args.agent} has ${agentExecutions.length} executions in the last hour`,
        autonomyMode,
      };
    }

    // Circuit breaker: 5 failures in 10 min → 30 min cooldown
    const windowStart = now - CIRCUIT_BREAKER_WINDOW_MS;
    const recentErrors = recentActivity.filter(
      (a) =>
        a.agent === args.agent &&
        a.level === "error" &&
        a.createdAt > windowStart
    );

    if (recentErrors.length >= CIRCUIT_BREAKER_FAILURES) {
      const lastError = recentErrors[0];
      if (
        lastError &&
        now - lastError.createdAt < CIRCUIT_BREAKER_COOLDOWN_MS
      ) {
        return {
          allowed: false,
          reason: `Circuit breaker: ${args.agent} has ${recentErrors.length} errors in ${CIRCUIT_BREAKER_WINDOW_MS / 60_000}min`,
          autonomyMode,
        };
      }
    }

    return { allowed: true, autonomyMode };
  },
});
