/**
 * Repo analysis CRUD — stores and retrieves autopilot repo analysis records.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

// Short cooldown so a code fix (e.g., updating a stale model ID and deploying)
// is retried on the very next heartbeat instead of forcing the user to wait
// hours. A failing analysis with an unchanged root cause still hits the cap
// below and surfaces as a health-banner alert.
const AUTO_RETRY_COOLDOWN_MS = 10 * 60 * 1000;
const AUTO_RETRY_MAX_ATTEMPTS = 5;
const AUTO_RETRY_LOG_MARKER = "Auto-retrying repo analysis";
const AUTO_RETRY_SCAN_WINDOW_MS = 24 * 60 * 60 * 1000;

export const createRepoAnalysis = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
  },
  returns: v.id("autopilotRepoAnalysis"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("autopilotRepoAnalysis", {
      organizationId: args.organizationId,
      repoUrl: args.repoUrl,
      createdAt: Date.now(),
    });
  },
});

export const updateRepoAnalysis = internalMutation({
  args: {
    analysisId: v.id("autopilotRepoAnalysis"),
    techStack: v.optional(v.string()),
    framework: v.optional(v.string()),
    hasCI: v.optional(v.boolean()),
    hasTests: v.optional(v.boolean()),
    hasDocs: v.optional(v.boolean()),
    hasLandingPage: v.optional(v.boolean()),
    hasAnalytics: v.optional(v.boolean()),
    hasMonitoring: v.optional(v.boolean()),
    projectStructure: v.optional(v.string()),
    maturityLevel: v.optional(
      v.union(
        v.literal("new"),
        v.literal("early"),
        v.literal("established"),
        v.literal("mature")
      )
    ),
    findings: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { analysisId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }
    await ctx.db.patch(analysisId, filtered);
    return null;
  },
});

export const getRepoAnalysis = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotRepoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();
  },
});

/**
 * Returns the timestamp of the most recent auto-retry log entry within the
 * scan window, or null when none exists. Used to enforce a cooldown so we
 * don't burn budget retrying a permanently broken analysis.
 */
export const findRecentAutoRetry = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    lastAt: v.union(v.number(), v.null()),
    countWithinWindow: v.number(),
  }),
  handler: async (ctx, args) => {
    const since = Date.now() - AUTO_RETRY_SCAN_WINDOW_MS;
    const recent = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", since)
      )
      .order("desc")
      .take(200);
    const matches = recent.filter(
      (entry) =>
        entry.agent === "system" &&
        typeof entry.message === "string" &&
        entry.message.startsWith(AUTO_RETRY_LOG_MARKER)
    );
    return {
      lastAt: matches[0]?.createdAt ?? null,
      countWithinWindow: matches.length,
    };
  },
});

/**
 * Heartbeat-side autonomous recovery: when CTO is blocked because no usable
 * repo analysis exists, kick one off automatically so the user never has to
 * click Recompute by hand. Idempotent — early-returns if an analysis is
 * already pending/in_progress, or if we recently auto-retried after an error.
 */
export const bootRepoAnalysisIfStuck = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const precondition = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getRepoAnalysisPrecondition,
      { organizationId: args.organizationId }
    );

    if (!precondition.githubConnected) {
      // Connecting GitHub requires user OAuth — health banner already surfaces this.
      return null;
    }

    if (
      precondition.integrationStatus === "pending" ||
      precondition.integrationStatus === "in_progress" ||
      precondition.integrationStatus === "completed"
    ) {
      // Either already running or already done — nothing to do.
      return null;
    }

    if (precondition.integrationStatus === "error") {
      const history = await ctx.runQuery(
        internal.autopilot.repo_analysis.findRecentAutoRetry,
        { organizationId: args.organizationId }
      );
      if (history.countWithinWindow >= AUTO_RETRY_MAX_ATTEMPTS) {
        // Too many failures in 24h. Stop wasting budget — health banner
        // already surfaces the underlying error message for the user.
        return null;
      }
      if (
        history.lastAt &&
        Date.now() - history.lastAt < AUTO_RETRY_COOLDOWN_MS
      ) {
        return null;
      }
    }

    try {
      await ctx.runMutation(
        internal.integrations.github.repo_analysis.startAnalysisInternal,
        { organizationId: args.organizationId }
      );
      const message =
        precondition.integrationStatus === "error"
          ? `${AUTO_RETRY_LOG_MARKER} after error`
          : "Auto-started repo analysis to unblock CTO";
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "action",
        message,
        details:
          precondition.integrationStatus === "error"
            ? (precondition.integrationError ?? undefined)
            : undefined,
      });
    } catch (error) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "warning",
        message: "Auto-start repo analysis failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  },
});
