/**
 * Auto-recovery bridge: detects when the chain is blocked because the GitHub
 * integration has no usable repo analysis, then triggers a re-run. The
 * integration's `repoAnalysis` table is the SSOT; this module never writes a
 * parallel record.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";

const AUTO_RETRY_COOLDOWN_MS = 10 * 60 * 1000;
const AUTO_RETRY_MAX_ATTEMPTS = 5;
const AUTO_RETRY_LOG_MARKER = "Auto-retrying repo analysis";
const AUTO_RETRY_SCAN_WINDOW_MS = 24 * 60 * 60 * 1000;

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
        entry.role === "system" &&
        typeof entry.message === "string" &&
        entry.message.startsWith(AUTO_RETRY_LOG_MARKER)
    );
    return {
      lastAt: matches[0]?.createdAt ?? null,
      countWithinWindow: matches.length,
    };
  },
});

type RecoveryReason =
  | "missing"
  | "error"
  | "completed_empty_payload"
  | "stale_payload";

const STALE_PAYLOAD_MS = 14 * 24 * 60 * 60 * 1000;

const reasonLogMessage = (reason: RecoveryReason): string => {
  switch (reason) {
    case "missing":
      return "Auto-started repo analysis to unblock CTO";
    case "error":
      return `${AUTO_RETRY_LOG_MARKER} after error`;
    case "completed_empty_payload":
      return `${AUTO_RETRY_LOG_MARKER}: previous run completed without productAnalysis`;
    case "stale_payload":
      return `${AUTO_RETRY_LOG_MARKER}: payload older than ${STALE_PAYLOAD_MS / (24 * 60 * 60 * 1000)} days`;
    default:
      return "Auto-started repo analysis";
  }
};

/**
 * Heartbeat-side autonomous recovery: when CTO is blocked because no usable
 * repo analysis exists, kick one off automatically so the user never has to
 * click Recompute by hand. Idempotent — early-returns if an analysis is
 * already pending/in_progress, or if we recently auto-retried (cooldown +
 * 24h cap). Recovers four states: missing, error, completed-but-empty,
 * stale-payload.
 */
export const bootRepoAnalysisIfStuck = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const precondition = await ctx.runQuery(
      internal.autopilot.role_skills.chain_producers
        .getRepoAnalysisPrecondition,
      { organizationId: args.organizationId }
    );

    if (!precondition.githubConnected) {
      return null;
    }

    if (
      precondition.integrationStatus === "pending" ||
      precondition.integrationStatus === "in_progress"
    ) {
      return null;
    }

    const recoveryReason: RecoveryReason | null = (() => {
      if (precondition.integrationStatus === "missing") {
        return "missing";
      }
      if (precondition.integrationStatus === "error") {
        return "error";
      }
      if (
        precondition.integrationStatus === "completed" &&
        !precondition.productAnalysisReady
      ) {
        return "completed_empty_payload";
      }
      if (
        precondition.integrationStatus === "completed" &&
        precondition.lastCompletedAt &&
        Date.now() - precondition.lastCompletedAt > STALE_PAYLOAD_MS
      ) {
        return "stale_payload";
      }
      return null;
    })();

    if (!recoveryReason) {
      return null;
    }

    const history = await ctx.runQuery(
      internal.autopilot.repo_analysis.findRecentAutoRetry,
      { organizationId: args.organizationId }
    );
    if (history.countWithinWindow >= AUTO_RETRY_MAX_ATTEMPTS) {
      return null;
    }
    if (
      history.lastAt &&
      Date.now() - history.lastAt < AUTO_RETRY_COOLDOWN_MS
    ) {
      return null;
    }

    try {
      await ctx.runMutation(
        internal.integrations.github.repo_analysis.startAnalysisInternal,
        { organizationId: args.organizationId }
      );
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        role: "system",
        level: "action",
        message: reasonLogMessage(recoveryReason),
        details:
          recoveryReason === "error"
            ? (precondition.integrationError ?? undefined)
            : undefined,
      });
    } catch (error) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        role: "system",
        level: "warning",
        message: "Auto-start repo analysis failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  },
});
