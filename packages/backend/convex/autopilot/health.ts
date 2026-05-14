/**
 * System Health — real-time health check for the autopilot system.
 *
 * Returns a structured status with issues and resolution hints,
 * consumed by the frontend to show health indicators.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { computeChainState } from "./chain";
import { DEFAULT_MAX_PENDING_TOTAL } from "./config_task_caps";
import type { HealthState } from "./health_checks";
import {
  AGENT_FIELDS,
  checkActivity,
  checkAgentCount,
  checkAutonomyMode,
  checkChainBlockers,
  checkCostCap,
  checkErrors,
  checkOrphanedTasks,
  checkPendingApprovals,
  checkPipelineCapacity,
  checkStuckTasks,
  checkTaskThrottle,
  ONE_HOUR,
  THIRTY_MINUTES,
  TOTAL_AGENTS,
} from "./health_checks";
import { requireOrgMembership } from "./queries/auth";

const healthIssueValidator = v.object({
  actionLabel: v.optional(v.string()),
  actionUrl: v.optional(v.string()),
  id: v.string(),
  message: v.string(),
  resolution: v.string(),
  severity: v.union(
    v.literal("critical"),
    v.literal("info"),
    v.literal("warning")
  ),
});

const systemHealthValidator = v.object({
  status: v.union(
    v.literal("critical"),
    v.literal("degraded"),
    v.literal("healthy"),
    v.literal("stopped")
  ),
  issues: v.array(healthIssueValidator),
  lastActivity: v.union(v.number(), v.null()),
  enabledAgentCount: v.number(),
  totalAgentCount: v.number(),
  pendingApprovalCount: v.optional(v.number()),
});

/**
 * Check the overall health of the autopilot system for an organization.
 */
export const getSystemHealth = query({
  args: { organizationId: v.id("organizations") },
  returns: systemHealthValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      return {
        status: "critical" as const,
        issues: [
          {
            id: "no_config",
            severity: "critical" as const,
            message: "Autopilot is not configured",
            resolution: "Go to Settings to initialize autopilot",
          },
        ],
        lastActivity: null,
        enabledAgentCount: 0,
        totalAgentCount: TOTAL_AGENTS,
      };
    }

    if (
      !config.enabled ||
      (config.autonomyMode ?? "supervised") === "stopped"
    ) {
      return {
        status: "stopped" as const,
        issues: [
          {
            id: "disabled",
            severity: "info" as const,
            message: "Autopilot is disabled",
            resolution: "Enable autopilot in Settings",
          },
        ],
        lastActivity: null,
        enabledAgentCount: 0,
        totalAgentCount: TOTAL_AGENTS,
      };
    }

    const state: HealthState = { status: "healthy", issues: [] };

    checkAutonomyMode(config, state);

    const enabledCount = checkAgentCount(config, state);

    const chainState = await computeChainState(ctx, args.organizationId);
    const repoAnalysis = await ctx.db
      .query("autopilotRepoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();
    const integrationAnalysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();
    const githubConnection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();
    const recentChainBlockerLog = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .gte("createdAt", Date.now() - 6 * ONE_HOUR)
      )
      .order("desc")
      .take(50);
    const lastBlockerLog = recentChainBlockerLog.find(
      (log) =>
        (log.level === "warning" || log.level === "error") &&
        typeof log.message === "string" &&
        log.message.startsWith("Cannot produce ")
    );

    const hasUsableAnalysis =
      repoAnalysis !== null || integrationAnalysis?.status === "completed";
    checkChainBlockers(
      chainState,
      {
        ctoEnabled: config.ctoEnabled !== false,
        githubConnected: Boolean(githubConnection?.repositoryFullName),
        hasRepoAnalysis: hasUsableAnalysis,
        lastBlockerLogAt: lastBlockerLog?.createdAt ?? null,
        repoAnalysisError:
          integrationAnalysis?.status === "error"
            ? (integrationAnalysis.error ?? "Unknown analysis error")
            : null,
      },
      state
    );

    const lastActivityEntry = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    const lastActivity = lastActivityEntry?.createdAt ?? null;
    checkActivity(lastActivity, state.status === "stopped", state);

    const inProgressItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const stuckCount = inProgressItems.filter(
      (w) => Date.now() - w.updatedAt > ONE_HOUR
    ).length;
    checkStuckTasks(stuckCount, state);

    const cutoff = Date.now() - THIRTY_MINUTES;
    const recentLogs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", cutoff)
      )
      .collect();

    checkErrors(recentLogs.filter((l) => l.level === "error").length, state);
    checkCostCap(config, state);
    checkTaskThrottle(config, state);

    // Check for orphaned work items (assigned to disabled agents)
    const enabledAgentNames = AGENT_FIELDS.filter(
      (field) => config[field] !== false
    ).map((field) => field.replace("Enabled", ""));
    const enabledSet = new Set(enabledAgentNames);

    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    const orphanedCount = todoItems.filter(
      (w) => w.assignedAgent && !enabledSet.has(w.assignedAgent)
    ).length;
    checkOrphanedTasks(orphanedCount, state);

    // Check items waiting for president approval
    const reviewWorkItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();
    const reviewDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();
    const reviewReports = await ctx.db
      .query("autopilotReports")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
    const pendingApprovalCount =
      reviewWorkItems.length + reviewDocs.length + reviewReports.length;
    checkPendingApprovals(pendingApprovalCount, state);

    // Check pipeline capacity
    const totalCap = config.maxPendingTasksTotal ?? DEFAULT_MAX_PENDING_TOTAL;
    const activeCount = todoItems.length + inProgressItems.length;
    checkPipelineCapacity(activeCount, totalCap, state);

    return {
      status: state.status,
      issues: state.issues,
      lastActivity,
      enabledAgentCount: enabledCount,
      totalAgentCount: TOTAL_AGENTS,
      pendingApprovalCount,
    };
  },
});
