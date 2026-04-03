/**
 * System Health — real-time health check for the autopilot system.
 *
 * Returns a structured status with issues and resolution hints,
 * consumed by the frontend to show health indicators.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

const ONE_HOUR = 60 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;

type HealthStatus = "critical" | "degraded" | "healthy" | "stopped";

interface HealthIssue {
  id: string;
  message: string;
  resolution: string;
  severity: "critical" | "info" | "warning";
}

interface HealthState {
  issues: HealthIssue[];
  status: HealthStatus;
}

function degradeTo(state: HealthState, target: HealthStatus): void {
  if (state.status === "healthy") {
    state.status = target;
  }
}

const AGENT_FIELDS = [
  "pmEnabled",
  "ctoEnabled",
  "devEnabled",
  "securityEnabled",
  "architectEnabled",
  "growthEnabled",
  "supportEnabled",
  "analyticsEnabled",
  "docsEnabled",
  "qaEnabled",
  "opsEnabled",
  "salesEnabled",
] as const;

const TOTAL_AGENTS = AGENT_FIELDS.length;

function checkAutonomyMode(
  config: { autonomyMode?: string },
  state: HealthState
): void {
  if ((config.autonomyMode ?? "supervised") === "stopped") {
    state.status = "stopped";
    state.issues.push({
      id: "stopped_mode",
      severity: "warning",
      message: "Autopilot is paused (stopped mode)",
      resolution: "Resume autopilot from the header controls",
    });
  }
}

function checkAgentCount(
  config: Record<string, unknown>,
  state: HealthState
): number {
  const enabledCount = AGENT_FIELDS.filter(
    (field) => config[field] !== false
  ).length;

  if (enabledCount === 0) {
    state.status = "critical";
    state.issues.push({
      id: "no_agents",
      severity: "critical",
      message: "No agents are enabled",
      resolution: "Enable at least one agent in the Agents page",
    });
  } else if (enabledCount <= 2) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "few_agents",
      severity: "warning",
      message: `Only ${enabledCount} of ${TOTAL_AGENTS} agents enabled`,
      resolution: "Consider enabling more agents for full coverage",
    });
  }

  return enabledCount;
}

function checkActivity(
  lastActivity: number | null,
  isStopped: boolean,
  state: HealthState
): void {
  if (isStopped) {
    return;
  }

  if (!lastActivity) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "no_activity",
      severity: "warning",
      message: "No agent activity recorded yet",
      resolution:
        "System may still be bootstrapping. Wait for the next cron tick.",
    });
    return;
  }

  if (Date.now() - lastActivity > ONE_HOUR) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "stale_activity",
      severity: "warning",
      message: "No agent activity in the last hour",
      resolution:
        "Check if tasks are available. Agents need pending tasks to work.",
    });
  }
}

function checkStuckTasks(stuckCount: number, state: HealthState): void {
  if (stuckCount > 0) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "stuck_tasks",
      severity: "warning",
      message: `${stuckCount} task(s) stuck in progress for over 1 hour`,
      resolution: "Check Tasks page for stuck work. Consider cancelling.",
    });
  }
}

function checkErrors(errorCount: number, state: HealthState): void {
  if (errorCount >= 3) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "frequent_errors",
      severity: "warning",
      message: `${errorCount} errors in the last 30 minutes`,
      resolution: "Check activity log for error details",
    });
  }
}

function checkCostCap(
  config: { costUsedTodayUsd?: number; dailyCostCapUsd?: number },
  state: HealthState
): void {
  if (!(config.dailyCostCapUsd && config.costUsedTodayUsd)) {
    return;
  }
  const usagePercent = config.costUsedTodayUsd / config.dailyCostCapUsd;
  if (usagePercent >= 1) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "cost_cap_reached",
      severity: "warning",
      message: "Daily cost cap reached — agents paused until reset",
      resolution: "Increase cost cap in Settings or wait for daily reset",
    });
  } else if (usagePercent >= 0.8) {
    state.issues.push({
      id: "cost_cap_near",
      severity: "info",
      message: `${Math.round(usagePercent * 100)}% of daily cost cap used`,
      resolution: "Monitor usage or increase cap in Settings",
    });
  }
}

function checkTaskThrottle(
  config: {
    maxTasksPerDay: number;
    tasksResetAt: number;
    tasksUsedToday: number;
  },
  state: HealthState
): void {
  if (
    Date.now() < config.tasksResetAt &&
    config.tasksUsedToday >= config.maxTasksPerDay
  ) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "task_throttle",
      severity: "warning",
      message: "Daily task dispatch limit reached",
      resolution: "Increase max tasks per day in Settings or wait for reset",
    });
  }
}

function checkOrphanedTasks(orphanedCount: number, state: HealthState): void {
  if (orphanedCount > 0) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "orphaned_tasks",
      severity: "warning",
      message: `${orphanedCount} task(s) assigned to disabled agents`,
      resolution: "Enable the agents or cancel these tasks from the Tasks page",
    });
  }
}

function checkCredentials(
  hasInvalidCredentials: boolean,
  state: HealthState
): void {
  if (hasInvalidCredentials) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "credentials_invalid",
      severity: "warning",
      message: "Adapter credentials are invalid or unvalidated",
      resolution: "Update credentials in Settings",
    });
  }
}

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

    if (!config.enabled) {
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

    const inProgressTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const stuckCount = inProgressTasks.filter(
      (t) => t.startedAt && Date.now() - t.startedAt > ONE_HOUR
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

    // Check for orphaned tasks (assigned to disabled agents)
    const enabledAgentNames = AGENT_FIELDS.filter(
      (field) => (config as unknown as Record<string, unknown>)[field] !== false
    ).map((field) => field.replace("Enabled", ""));
    const enabledSet = new Set(enabledAgentNames);

    const pendingTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const orphanedCount = pendingTasks.filter(
      (t) => !enabledSet.has(t.assignedAgent)
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

    const hasInvalidCreds =
      credentials !== null && credentials.isValid === false;
    checkCredentials(hasInvalidCreds, state);

    return {
      status: state.status,
      issues: state.issues,
      lastActivity,
      enabledAgentCount: enabledCount,
      totalAgentCount: TOTAL_AGENTS,
    };
  },
});
