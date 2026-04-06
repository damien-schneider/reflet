/**
 * V9 Autonomy Engine — maximizes autonomous execution.
 *
 * Principle: only real-world-impacting actions need human approval.
 * Everything internal (analysis, docs, orchestration, planning, scanning,
 * drafting content) executes autonomously regardless of mode.
 *
 * Real-world impact = contacting a human, deploying code, merging PRs,
 * sending emails, publishing externally, sales outreach.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import { autonomyMode } from "./schema/validators";

// ============================================
// ACTION CATEGORIES
// ============================================

/**
 * Actions that execute autonomously in ALL modes (except stopped).
 * These are internal operations with zero real-world side effects.
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
  "create_pr",
]) as ReadonlySet<string>;

/**
 * Actions with REAL-WORLD IMPACT — these contact humans, deploy code,
 * or publish externally. In supervised mode, they require approval.
 * In full_auto mode, they execute with a safety delay.
 */
const REAL_WORLD_IMPACT_ACTIONS = new Set([
  "merge_pr",
  "send_email",
  "publish_content",
  "contact_user",
  "deploy",
  "rollback",
  "sales_outreach",
]) as ReadonlySet<string>;

// ============================================
// REVIEW TYPE CLASSIFICATION
// ============================================

/**
 * Review types that represent real-world impact — actions that contact humans,
 * publish externally, or have irreversible external consequences.
 * Only these should set `needsReview: true` in supervised mode.
 */
const REAL_WORLD_REVIEW_TYPES = new Set([
  "growth_content", // posts replies on Reddit/HN/LinkedIn (external)
  "support_reply", // sends a reply to a real user
  "support_escalation", // escalates to a human
  "sales_outreach", // contacts a prospect
  "pr_review", // code PR ready to merge
]) as ReadonlySet<string>;

/**
 * Returns true only for review types with external real-world impact.
 * Internal operations (reports, coordination, research, bootstrap tasks)
 * should never block the inbox.
 */
export const isRealWorldReviewType = (reviewType: string): boolean =>
  REAL_WORLD_REVIEW_TYPES.has(reviewType);

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

    const mode = config?.autonomyMode ?? "supervised";

    // No config or stopped mode — block everything
    if (!config || mode === "stopped") {
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

    // Real-world impact actions — gated by mode
    if (REAL_WORLD_IMPACT_ACTIONS.has(args.action)) {
      // Supervised mode — send to inbox for human approval
      if (mode === "supervised") {
        return {
          allowed: true,
          reason: "Supervised mode requires approval for real-world actions",
          requiresInbox: true,
          delayMs: 0,
        };
      }

      // Full auto mode — execute with a safety delay
      const DEFAULT_FULL_AUTO_DELAY_MS = 5 * 60 * 1000;
      const delay = config.fullAutoDelay ?? DEFAULT_FULL_AUTO_DELAY_MS;
      return {
        allowed: true,
        reason: "Full auto mode — executing with safety delay",
        requiresInbox: false,
        delayMs: delay,
      };
    }

    // Default: allow immediately
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

    return !config || (config.autonomyMode ?? "supervised") === "stopped";
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
        autonomyMode: "stopped",
        stoppedAt: now,
        updatedAt: now,
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
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
        await ctx.db.patch(item._id, { status: "in_progress", updatedAt: now });
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
        message: `Autopilot resumed in ${args.mode} mode — ${backlogItems.length} work items resumed`,
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
