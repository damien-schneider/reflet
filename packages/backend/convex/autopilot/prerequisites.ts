/**
 * Agent Prerequisites — checks if an agent has the data it needs before running.
 *
 * Prevents agents from calling LLMs with empty data (which causes hallucinated alerts).
 * Each agent has specific data requirements. If not met, the agent skips silently
 * and logs a max-once-per-day info message.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ============================================
// PREREQUISITE CHECK RESULT
// ============================================

const prereqResultValidator = v.object({
  ready: v.boolean(),
  reason: v.optional(v.string()),
});

// ============================================
// SKIP LOG TRACKING
// ============================================

/**
 * Check if a skip was logged recently for this agent (within windowHours).
 * Prevents spamming the activity log with "no data" messages every cron tick.
 */
export const wasSkipLoggedRecently = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
    windowHours: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.windowHours * 60 * 60 * 1000;

    const recentLogs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", cutoff)
      )
      .collect();

    return recentLogs.some(
      (log) =>
        log.agent === args.agent &&
        log.level === "info" &&
        log.message.includes("skipping")
    );
  },
});

// ============================================
// AGENT-SPECIFIC PREREQUISITES
// ============================================

/**
 * Check if the ops agent has real deployment data to analyze.
 */
export const checkOpsPrerequisites = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: prereqResultValidator,
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query("autopilotOpsSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (snapshots.length === 0) {
      return {
        ready: false,
        reason:
          "No CI/CD data connected yet. Connect Vercel or add deployment data.",
      };
    }

    const hasRealData = snapshots.some(
      (s) => s.deployCount > 0 || s.failedDeploys > 0 || (s.errorRate ?? 0) > 0
    );

    if (!hasRealData) {
      return {
        ready: false,
        reason: "Ops snapshots contain no deployment data.",
      };
    }

    return { ready: true };
  },
});

/**
 * Check if the analytics agent has snapshot data to analyze.
 */
export const checkAnalyticsPrerequisites = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: prereqResultValidator,
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query("autopilotAnalyticsSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (snapshots.length === 0) {
      return {
        ready: false,
        reason: "No analytics data. Connect PostHog or add analytics data.",
      };
    }

    const hasRealData = snapshots.some(
      (s) => s.activeUsers > 0 || s.newUsers > 0
    );

    if (!hasRealData) {
      return {
        ready: false,
        reason:
          "Analytics snapshots contain no user data — waiting for real metrics.",
      };
    }

    return { ready: true };
  },
});

/**
 * Check if the growth agent has completed tasks or feedback to generate content from.
 */
export const checkGrowthPrerequisites = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: prereqResultValidator,
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const completedTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .collect();

    const recentCompletedTasks = completedTasks.filter(
      (t) => t.completedAt && t.completedAt > sevenDaysAgo
    );

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (recentCompletedTasks.length === 0 && !feedbackItems) {
      return {
        ready: false,
        reason:
          "No completed tasks or feedback to generate content from. Complete some tasks first.",
      };
    }

    return { ready: true };
  },
});

/**
 * Check if the docs agent has relevant data to work with.
 */
export const checkDocsPrerequisites = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: prereqResultValidator,
  handler: async (ctx, args) => {
    // Docs needs either completed tasks or support conversations
    const completedTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .first();

    const conversations = await ctx.db
      .query("autopilotSupportConversations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!(completedTasks || conversations)) {
      return {
        ready: false,
        reason:
          "No completed tasks or support conversations to analyze for doc updates.",
      };
    }

    return { ready: true };
  },
});

/**
 * Check if the QA agent has tasks with specs to generate tests for.
 */
export const checkQaPrerequisites = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: prereqResultValidator,
  handler: async (ctx, args) => {
    // QA needs tasks with acceptance criteria or technical specs
    const pendingTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const tasksWithSpecs = pendingTasks.filter(
      (t) => t.assignedAgent === "qa" && (t.acceptanceCriteria?.length ?? 0) > 0
    );

    if (tasksWithSpecs.length === 0) {
      return {
        ready: false,
        reason: "No QA tasks with acceptance criteria to generate tests for.",
      };
    }

    return { ready: true };
  },
});

/**
 * Check if the sales agent has leads or configured data to work with.
 */
export const checkSalesPrerequisites = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: prereqResultValidator,
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("autopilotLeads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!leads) {
      return {
        ready: false,
        reason:
          "No leads in the pipeline. Add leads manually or enable lead discovery.",
      };
    }

    return { ready: true };
  },
});

/**
 * Log a prerequisite skip (max once per 24h per agent).
 */
export const logPrerequisiteSkip = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      agent: args.agent as
        | "pm"
        | "cto"
        | "dev"
        | "security"
        | "architect"
        | "growth"
        | "orchestrator"
        | "system"
        | "support"
        | "analytics"
        | "docs"
        | "qa"
        | "ops"
        | "sales",
      level: "info",
      message: `${args.agent}: ${args.reason} — skipping run.`,
      createdAt: Date.now(),
    });
  },
});
