/**
 * System Health — real-time health check for the autopilot system.
 *
 * Returns a structured status with issues and resolution hints,
 * consumed by the frontend to show health indicators.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import type { HealthState } from "./health_checks";
import {
  AGENT_FIELDS,
  checkActivity,
  checkAgentCount,
  checkAutonomyMode,
  checkCostCap,
  checkCredentials,
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

/**
 * Check the overall health of the autopilot system for an organization.
 */
export const getSystemHealth = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await getAuthUser(ctx);
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

    if ((config.autonomyMode ?? "supervised") === "stopped") {
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

    const enabledCount = checkAgentCount(
      config as unknown as Record<string, unknown>,
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
      (field) => (config as unknown as Record<string, unknown>)[field] !== false
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

    // Check adapter credentials validity
    const credentials = await ctx.db
      .query("autopilotAdapterCredentials")
      .withIndex("by_org_adapter", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("adapter", config.adapter)
      )
      .unique();

    let credentialStatus: "missing" | "invalid" | "valid" = "missing";
    if (credentials) {
      credentialStatus = credentials.isValid ? "valid" : "invalid";
    }
    checkCredentials(credentialStatus, config.adapter, state);

    // Check if Dev agent is enabled but pipeline is blocked by missing credentials
    const devEnabled =
      (config as unknown as Record<string, unknown>).devEnabled !== false;
    if (devEnabled && credentialStatus !== "valid") {
      state.issues.push({
        id: "dev_pipeline_blocked",
        severity: "warning",
        message:
          "Dev agent is enabled but cannot execute — coding adapter credentials are missing or invalid",
        resolution:
          "Configure adapter credentials in Settings to unblock the Dev pipeline",
        actionUrl: "settings",
        actionLabel: "Configure Credentials",
      });
    }

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
    const pendingApprovalCount = reviewWorkItems.length + reviewDocs.length;
    checkPendingApprovals(pendingApprovalCount, state);

    // Check pipeline capacity
    const totalCap = (config.maxPendingTasksTotal as number | undefined) ?? 5;
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
