/**
 * Universal Autonomy Gate — every agent action passes through here.
 *
 * Extends the existing autonomy.ts with rate limiting, deduplication awareness,
 * and per-agent action type checking. This is the single entry point that
 * replaces scattered autonomy checks across agents.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { getEffectiveTier } from "../billing/effective_tier";
import { isAgentEnabledInConfig } from "./config";
import { assignedAgent } from "./schema/validators";

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

    const tier = await getEffectiveTier(ctx, args.organizationId);
    if (tier !== "pro") {
      return { proceed: false, reason: "plan_limit" as const };
    }

    // 3. Check if agent is enabled
    if (!isAgentEnabledInConfig(args.agent, config)) {
      return { proceed: false, reason: "agent_disabled" as const };
    }

    if (args.action === "create_task") {
      const now = Date.now();
      const effectiveUsed =
        now >= config.tasksResetAt ? 0 : config.tasksUsedToday;
      if (effectiveUsed >= config.maxTasksPerDay) {
        return { proceed: false, reason: "plan_limit" as const };
      }
    }

    if (ALWAYS_AUTONOMOUS_ACTIONS.has(args.action)) {
      return { proceed: true, reason: "allowed" as const };
    }

    const limit = ACTION_LIMIT_MAP[args.action];
    if (limit !== undefined) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentMatchingActions = await ctx.db
        .query("autopilotActivityLog")
        .withIndex("by_org_action", (q) =>
          q.eq("organizationId", args.organizationId).eq("action", args.action)
        )
        .collect();

      const actionCount = recentMatchingActions.filter(
        (a) =>
          a.agent === args.agent &&
          a.level === "action" &&
          a.createdAt >= oneHourAgo
      ).length;
      if (actionCount >= limit) {
        return { proceed: false, reason: "rate_limit" as const };
      }
    }

    const costUsed = config.costUsedTodayUsd ?? 0;
    if (
      config.dailyCostCapUsd !== undefined &&
      costUsed >= config.dailyCostCapUsd
    ) {
      return { proceed: false, reason: "cost_limit" as const };
    }

    if (ALWAYS_APPROVAL_ACTIONS.has(args.action)) {
      return { proceed: true, reason: "requires_approval" as const };
    }

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

    const tier = await getEffectiveTier(ctx, args.organizationId);
    if (tier !== "pro") {
      return false;
    }

    return isAgentEnabledInConfig(args.agent, config);
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

    if (
      !config?.enabled ||
      (config.autonomyMode ?? "supervised") === "stopped"
    ) {
      return true;
    }

    const tier = await getEffectiveTier(ctx, args.organizationId);
    return tier !== "pro";
  },
});
