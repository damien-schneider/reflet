/**
 * Universal Autonomy Gate — every agent action passes through here.
 *
 * Extends the existing autonomy.ts with rate limiting, deduplication awareness,
 * and per-agent action type checking. This is the single entry point that
 * replaces scattered autonomy checks across agents.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { assignedAgent } from "./schema/validators";

// ============================================
// ACTION TYPES
// ============================================

export const gateActionType = v.union(
  v.literal("read"),
  v.literal("create_inbox_item"),
  v.literal("create_task"),
  v.literal("update_task"),
  v.literal("send_email"),
  v.literal("publish_content"),
  v.literal("create_pr"),
  v.literal("merge_pr"),
  v.literal("deploy"),
  v.literal("rollback"),
  v.literal("contact_user"),
  v.literal("sales_outreach"),
  v.literal("delete")
);

// ============================================
// RATE LIMITS (per agent, per hour)
// ============================================

const AGENT_RATE_LIMITS = {
  max_inbox_items_per_hour: 10,
  max_tasks_per_hour: 5,
  max_emails_per_hour: 3,
  max_content_per_hour: 5,
  max_prs_per_hour: 3,
  max_support_drafts_per_hour: 5,
} as const;

const ACTION_LIMIT_MAP: Record<string, number> = {
  create_inbox_item: AGENT_RATE_LIMITS.max_inbox_items_per_hour,
  send_email: AGENT_RATE_LIMITS.max_emails_per_hour,
  publish_content: AGENT_RATE_LIMITS.max_content_per_hour,
  create_pr: AGENT_RATE_LIMITS.max_prs_per_hour,
};

// Actions that are always autonomous (both supervised and full_auto).
// create_task and create_inbox_item are always allowed — task caps handle limits.
const ALWAYS_AUTONOMOUS_ACTIONS = new Set([
  "read",
  "create_inbox_item",
  "create_task",
  "update_task",
]);

// Actions requiring approval in supervised mode, auto with delay in full_auto.
const APPROVAL_REQUIRED_ACTIONS = new Set([
  "send_email",
  "publish_content",
  "create_pr",
  "merge_pr",
  "deploy",
  "rollback",
  "contact_user",
]);

// Actions that always require approval regardless of mode.
const ALWAYS_APPROVAL_ACTIONS = new Set(["sales_outreach", "delete"]);

// ============================================
// GATE RESULT TYPE
// ============================================

const gateResultValidator = v.object({
  proceed: v.boolean(),
  reason: v.optional(
    v.union(
      v.literal("stopped"),
      v.literal("requires_approval"),
      v.literal("plan_limit"),
      v.literal("cost_limit"),
      v.literal("rate_limit"),
      v.literal("agent_disabled"),
      v.literal("allowed")
    )
  ),
});

function isAgentEnabledInConfig(
  config: {
    ctoEnabled?: boolean;
    devEnabled?: boolean;
    growthEnabled?: boolean;
    pmEnabled?: boolean;
    salesEnabled?: boolean;
    supportEnabled?: boolean;
  },
  agent: string
): boolean {
  switch (agent) {
    case "pm":
      return config.pmEnabled !== false;
    case "cto":
      return config.ctoEnabled !== false;
    case "dev":
      return config.devEnabled !== false;
    case "growth":
      return config.growthEnabled !== false;
    case "support":
      return config.supportEnabled !== false;
    case "sales":
      return config.salesEnabled !== false;
    default:
      return true;
  }
}

// ============================================
// GATE CHECK
// ============================================

/**
 * Universal gate check. Every agent calls this before any action.
 *
 * Checks in order:
 * 1. Is autonomy mode active (not "stopped")?
 * 2. Is the specific agent enabled?
 * 3. Rate limit check
 * 4. Cost limit check
 * 5. Action-type-specific permissions
 */
export const checkGate = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    action: gateActionType,
    agent: assignedAgent,
  },
  returns: gateResultValidator,
  handler: async (ctx, args) => {
    // 1. Get config
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    // 1b. Check autonomy mode (stopped = disabled)
    const mode = config?.autonomyMode ?? "supervised";
    if (!config?.enabled || mode === "stopped") {
      return { proceed: false, reason: "stopped" as const };
    }

    // 3. Check if agent is enabled
    if (!isAgentEnabledInConfig(config, args.agent)) {
      return { proceed: false, reason: "agent_disabled" as const };
    }

    // 4. Always-autonomous actions pass without rate limits
    if (ALWAYS_AUTONOMOUS_ACTIONS.has(args.action)) {
      return { proceed: true, reason: "allowed" as const };
    }

    // 5. Rate limit check — count recent actions by this agent
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentByAgent = recentActivity.filter(
      (a) => a.agent === args.agent && a.createdAt >= oneHourAgo
    );

    // Check rate limit based on action type
    const limit = ACTION_LIMIT_MAP[args.action];
    if (limit !== undefined) {
      const actionCount = recentByAgent.filter(
        (a) => a.level === "action"
      ).length;
      if (actionCount >= limit) {
        return { proceed: false, reason: "rate_limit" as const };
      }
    }

    // 6. Cost limit check
    const dailyCap = config.dailyCostCapUsd ?? 50;
    const costUsed = config.costUsedTodayUsd ?? 0;
    if (costUsed >= dailyCap) {
      return { proceed: false, reason: "cost_limit" as const };
    }

    // 7. Task throttle check (daily limit — kept as a safety cap)
    if (args.action === "create_task") {
      const now = Date.now();
      const tasksUsedToday = config.tasksUsedToday;
      const tasksResetAt = config.tasksResetAt;

      // Reset counter if past the reset time
      const effectiveUsed = now >= tasksResetAt ? 0 : tasksUsedToday;
      if (effectiveUsed >= config.maxTasksPerDay) {
        return { proceed: false, reason: "plan_limit" as const };
      }
    }

    // 8. Actions that always require approval regardless of mode
    if (ALWAYS_APPROVAL_ACTIONS.has(args.action)) {
      return { proceed: true, reason: "requires_approval" as const };
    }

    // 9. Destructive or external actions require approval in supervised mode
    if (mode === "supervised" && APPROVAL_REQUIRED_ACTIONS.has(args.action)) {
      return { proceed: true, reason: "requires_approval" as const };
    }

    return { proceed: true, reason: "allowed" as const };
  },
});

/**
 * Quick check: is the agent allowed to do anything at all?
 * Used by agents to short-circuit early before expensive work.
 */
export const isAgentActive = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
  },
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

    return isAgentEnabledInConfig(config, args.agent);
  },
});

/**
 * Check if the system is in stopped mode for an org.
 * Quick short-circuit for cron handlers and bulk operations.
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
