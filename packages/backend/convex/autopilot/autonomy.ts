/**
 * V6 Autonomy Engine — determines whether an agent action should execute.
 *
 * Every agent action checks this before executing. The engine reads
 * the organization's autonomyMode and the action's category to decide:
 * - execute immediately
 * - create inbox item for approval
 * - block entirely (stopped mode)
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import { autonomyMode } from "./tableFields";

// ============================================
// ACTION CATEGORIES
// ============================================

/**
 * Actions that never require approval regardless of mode.
 * These are read-only, internal, or planning-only operations.
 */
const ALWAYS_AUTONOMOUS_ACTIONS = new Set([
  "agent_communication",
  "planning",
  "analysis",
  "internal_report",
  "codebase_read",
  "draft_content",
  "run_scan",
  "create_inbox_item",
]) as ReadonlySet<string>;

/**
 * Actions that always require approval regardless of mode.
 * These contact real people and can't be reversed.
 */
const ALWAYS_REQUIRE_APPROVAL_ACTIONS = new Set([
  "sales_outreach",
]) as ReadonlySet<string>;

/**
 * Actions that require approval in supervised mode but
 * auto-execute in full_auto mode (with delay).
 */
const SUPERVISED_APPROVAL_ACTIONS = new Set([
  "create_pr",
  "merge_pr",
  "send_email",
  "publish_content",
  "contact_user",
  "deploy",
  "rollback",
]) as ReadonlySet<string>;

// ============================================
// QUERIES
// ============================================

export const actionCategory = v.union(
  v.literal("agent_communication"),
  v.literal("planning"),
  v.literal("analysis"),
  v.literal("internal_report"),
  v.literal("codebase_read"),
  v.literal("draft_content"),
  v.literal("run_scan"),
  v.literal("create_inbox_item"),
  v.literal("create_pr"),
  v.literal("merge_pr"),
  v.literal("send_email"),
  v.literal("publish_content"),
  v.literal("contact_user"),
  v.literal("deploy"),
  v.literal("rollback"),
  v.literal("sales_outreach"),
  v.literal("high_cost_task")
);

export interface ActionDecision {
  allowed: boolean;
  delayMs: number;
  reason: string;
  requiresInbox: boolean;
}

/**
 * Check whether an action should execute based on autonomy mode.
 *
 * Returns:
 * - allowed=true, requiresInbox=false → execute immediately
 * - allowed=true, requiresInbox=true → send to inbox for approval
 * - allowed=false → do not execute at all
 */
export const shouldExecuteAction = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    action: actionCategory,
    estimatedCostUsd: v.optional(v.number()),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.string(),
    requiresInbox: v.boolean(),
    delayMs: v.number(),
  }),
  handler: async (ctx, args): Promise<ActionDecision> => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config?.enabled) {
      return {
        allowed: false,
        reason: "Autopilot is disabled",
        requiresInbox: false,
        delayMs: 0,
      };
    }

    const mode = config.autonomyMode ?? "supervised";

    // Stopped mode — block everything
    if (mode === "stopped") {
      return {
        allowed: false,
        reason: "Autopilot is stopped",
        requiresInbox: false,
        delayMs: 0,
      };
    }

    // Always-autonomous actions pass in any active mode
    if (ALWAYS_AUTONOMOUS_ACTIONS.has(args.action)) {
      return {
        allowed: true,
        reason: "Action is always autonomous",
        requiresInbox: false,
        delayMs: 0,
      };
    }

    // Always-require-approval actions
    if (ALWAYS_REQUIRE_APPROVAL_ACTIONS.has(args.action)) {
      return {
        allowed: true,
        reason: "Sales outreach always requires approval",
        requiresInbox: true,
        delayMs: 0,
      };
    }

    // Check cost cap
    const HIGH_COST_THRESHOLD_USD = 1;
    const isHighCost =
      args.estimatedCostUsd !== undefined &&
      args.estimatedCostUsd > HIGH_COST_THRESHOLD_USD;

    if (isHighCost && mode === "supervised") {
      return {
        allowed: true,
        reason: `Estimated cost $${args.estimatedCostUsd} exceeds threshold`,
        requiresInbox: true,
        delayMs: 0,
      };
    }

    // Supervised mode — approval-requiring actions go to inbox
    if (mode === "supervised" && SUPERVISED_APPROVAL_ACTIONS.has(args.action)) {
      return {
        allowed: true,
        reason: "Supervised mode requires approval for this action",
        requiresInbox: true,
        delayMs: 0,
      };
    }

    // Full auto mode — external actions get a delay
    if (mode === "full_auto" && SUPERVISED_APPROVAL_ACTIONS.has(args.action)) {
      const DEFAULT_FULL_AUTO_DELAY_MS = 15 * 60 * 1000;
      const delay = config.fullAutoDelay ?? DEFAULT_FULL_AUTO_DELAY_MS;
      return {
        allowed: true,
        reason: "Full auto mode — executing with delay",
        requiresInbox: false,
        delayMs: delay,
      };
    }

    // Default: allow
    return {
      allowed: true,
      reason: "Action permitted",
      requiresInbox: false,
      delayMs: 0,
    };
  },
});

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

    if (!config?.enabled) {
      return true;
    }

    return (config.autonomyMode ?? "supervised") === "stopped";
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

    // Transitioning TO stopped — pause in-progress tasks
    if (args.mode === "stopped" && previousMode !== "stopped") {
      const inProgressTasks = await ctx.db
        .query("autopilotTasks")
        .withIndex("by_org_status", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("status", "in_progress")
        )
        .collect();

      for (const task of inProgressTasks) {
        await ctx.db.patch(task._id, { status: "paused" });
      }

      await ctx.db.patch(config._id, {
        autonomyMode: "stopped",
        stoppedAt: now,
        updatedAt: now,
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "warning",
        message: `Autopilot stopped — ${inProgressTasks.length} tasks paused`,
      });

      return null;
    }

    // Transitioning FROM stopped — resume paused tasks
    if (previousMode === "stopped" && args.mode !== "stopped") {
      const pausedTasks = await ctx.db
        .query("autopilotTasks")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "paused")
        )
        .collect();

      for (const task of pausedTasks) {
        await ctx.db.patch(task._id, { status: "in_progress" });
      }

      await ctx.db.patch(config._id, {
        autonomyMode: args.mode,
        stoppedAt: undefined,
        updatedAt: now,
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "success",
        message: `Autopilot resumed in ${args.mode} mode — ${pausedTasks.length} tasks resumed`,
      });

      return null;
    }

    // Mode switch between supervised/full_auto
    await ctx.db.patch(config._id, {
      autonomyMode: args.mode,
      updatedAt: now,
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "info",
      message: `Autonomy mode changed to ${args.mode}`,
    });

    return null;
  },
});
