/**
 * Autopilot orchestrator — the cron that drives the task pipeline.
 *
 * Runs periodically to dispatch pending tasks to the appropriate adapter.
 * Follows the intelligence module pattern: scan orgs → dispatch per org.
 */

import type { Infer } from "convex/values";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalQuery } from "../_generated/server";
import type { actionCategory } from "./autonomy";
import type { activityLogAgent } from "./tableFields";

type AgentName = Infer<typeof activityLogAgent>;
type ActionCategory = Infer<typeof actionCategory>;

// ============================================
// QUERIES
// ============================================

/**
 * Find all organizations with autopilot enabled, not stopped, and pending tasks.
 */
export const getOrgsWithPendingWork = internalQuery({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("autopilotConfig").collect();

    const orgsWithWork: Array<{
      organizationId: Id<"organizations">;
      configId: Id<"autopilotConfig">;
    }> = [];
    for (const config of configs) {
      if (!config.enabled) {
        continue;
      }

      // V6: Skip orgs in stopped mode
      if ((config.autonomyMode ?? "supervised") === "stopped") {
        continue;
      }

      // Check if there are pending tasks
      const pendingTasks = await ctx.db
        .query("autopilotTasks")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", config.organizationId).eq("status", "pending")
        )
        .first();

      if (pendingTasks) {
        orgsWithWork.push({
          organizationId: config.organizationId,
          configId: config._id,
        });
      }
    }

    return orgsWithWork;
  },
});

/**
 * Get recent activity log entries for an org (used by CEO tools).
 */
export const getRecentActivityForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit);
  },
});

const THIRTY_MINUTES = 30 * 60 * 1000;

/**
 * Check if an org has been idle (no activity) for 30+ minutes.
 * Used by the orchestrator to trigger proactive PM analysis.
 * Excludes tasks assigned to disabled agents from the in-progress check.
 */
export const isOrgIdle = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - THIRTY_MINUTES;

    // Check for any recent activity
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", cutoff)
      )
      .first();

    if (recentActivity) {
      return false;
    }

    // Get enabled agents to exclude orphaned tasks from the "busy" check
    const enabledAgents = await ctx.runQuery(
      internal.autopilot.config.getEnabledAgents,
      { organizationId: args.organizationId }
    );
    const enabledSet: ReadonlySet<string> = new Set(enabledAgents);

    // Check for in-progress tasks on enabled agents (agents actually working)
    const inProgressTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const activeOnEnabledAgents = inProgressTasks.some((t) =>
      enabledSet.has(t.assignedAgent)
    );

    return !activeOnEnabledAgents;
  },
});

// ============================================
// ACTIONS
// ============================================

/**
 * Main orchestrator entry point — called by the cron scheduler.
 *
 * For each org with autopilot enabled:
 *   1. Dispatch pending tasks to appropriate agents
 *   2. Detect idle orgs (no pending tasks, no recent activity) and trigger PM analysis
 */
export const runOrchestrator = internalAction({
  args: {},
  handler: async (ctx) => {
    // Dispatch pending work
    const orgsWithWork = await ctx.runQuery(
      internal.autopilot.crons.getOrgsWithPendingWork
    );

    for (const org of orgsWithWork) {
      try {
        await ctx.runAction(internal.autopilot.crons.dispatchOrgTasks, {
          organizationId: org.organizationId,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[autopilot] Orchestrator error for org ${org.organizationId}: ${msg}`
        );
      }
    }

    // Idle detection: trigger proactive discovery for orgs with no work
    const orgsWithWorkIds = new Set(
      orgsWithWork.map((o: { organizationId: string }) => o.organizationId)
    );
    const allEnabledOrgs = await ctx.runQuery(
      internal.autopilot.crons.getEnabledOrgs
    );

    for (const org of allEnabledOrgs) {
      if (orgsWithWorkIds.has(org.organizationId)) {
        continue;
      }

      const isIdle = await ctx.runQuery(internal.autopilot.crons.isOrgIdle, {
        organizationId: org.organizationId,
      });

      if (!isIdle) {
        continue;
      }

      // Proactive discovery: run lightweight scans for idle orgs
      // Note: support triage is event-driven (triggered on new messages), not polled.
      const proactiveAgents = [
        {
          agent: "pm" as const,
          action: internal.autopilot.agents.pm.runPMAnalysis,
          args: { organizationId: org.organizationId },
        },
        {
          agent: "security" as const,
          action: internal.autopilot.agents.security.runSecurityScan,
          args: {
            organizationId: org.organizationId,
            triggerReason: "daily_scan" as const,
          },
        },
      ];

      for (const { agent, action, args } of proactiveAgents) {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent }
        );
        if (!enabled) {
          continue;
        }
        try {
          await ctx.runAction(action, args);
        } catch {
          // Best effort — proactive scans are not critical
        }
      }
    }
  },
});

// ============================================
// TASK LIFECYCLE WRAPPER
// ============================================

/**
 * Map agent types to autonomy action categories.
 * Agents performing analysis-only work are always autonomous.
 */
const AGENT_ACTION_CATEGORY: Record<string, ActionCategory> = {
  dev: "create_pr",
  cto: "analysis",
  pm: "analysis",
  security: "run_scan",
  architect: "analysis",
  growth: "publish_content",
  support: "contact_user",
  analytics: "analysis",
  docs: "analysis",
  qa: "analysis",
  ops: "deploy",
  sales: "sales_outreach",
};

/**
 * Run an agent action with proper task lifecycle management.
 * Sets task to in_progress, runs the action, then marks completed/failed.
 */
const runAgentWithTaskLifecycle = async (
  ctx: ActionCtx,
  params: {
    organizationId: Id<"organizations">;
    taskId: Id<"autopilotTasks">;
    agentName: AgentName;
    action: () => Promise<unknown>;
  }
): Promise<void> => {
  await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
    taskId: params.taskId,
    status: "in_progress",
  });

  try {
    await params.action();
    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId: params.taskId,
      status: "completed",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId: params.taskId,
      status: "failed",
      errorMessage: `${params.agentName} failed: ${errorMessage}`,
    });
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: params.organizationId,
      taskId: params.taskId,
      agent: params.agentName,
      level: "error",
      message: `Task failed: ${errorMessage}`,
    });
  }
};

/**
 * Dispatch pending tasks for a single organization.
 */
export const dispatchOrgTasks = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Check throttle
    const canDispatch = await ctx.runQuery(
      internal.autopilot.config.canDispatchTask,
      { organizationId: args.organizationId }
    );

    if (!canDispatch) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "orchestrator",
        level: "info",
        message: "Daily task limit reached — waiting for reset",
      });
      return;
    }

    // Get dispatchable tasks
    const allTasks = await ctx.runQuery(
      internal.autopilot.tasks.getDispatchableTasks,
      { organizationId: args.organizationId }
    );

    if (allTasks.length === 0) {
      return;
    }

    // Dispatch up to 3 tasks per tick, skipping disabled agents
    const MAX_DISPATCHES_PER_TICK = 3;
    let dispatched = 0;

    for (const task of allTasks) {
      if (dispatched >= MAX_DISPATCHES_PER_TICK) {
        break;
      }

      // Check if the assigned agent is enabled — skip to next task if not
      const agentEnabled = await ctx.runQuery(
        internal.autopilot.config.isAgentEnabled,
        {
          organizationId: args.organizationId,
          agent: task.assignedAgent,
        }
      );

      if (!agentEnabled) {
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          taskId: task._id,
          agent: "orchestrator",
          level: "info",
          message: `Skipped task "${task.title}" — ${task.assignedAgent} agent is disabled`,
        });
        continue;
      }

      // Autonomy check — determine if action requires inbox approval or delay
      const actionCategory =
        AGENT_ACTION_CATEGORY[task.assignedAgent] ?? "analysis";
      const autonomyDecision = await ctx.runQuery(
        internal.autopilot.autonomy.shouldExecuteAction,
        {
          organizationId: args.organizationId,
          action: actionCategory,
        }
      );

      if (!autonomyDecision.allowed) {
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          taskId: task._id,
          agent: "orchestrator",
          level: "info",
          message: `Task blocked: ${autonomyDecision.reason}`,
        });
        continue;
      }

      if (autonomyDecision.requiresInbox) {
        await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
          organizationId: args.organizationId,
          type: "task_approval",
          title: `Approve: ${task.title}`,
          summary: `${task.assignedAgent} agent wants to execute: ${task.description}`,
          sourceAgent: task.assignedAgent,
          priority: task.priority,
          relatedTaskId: task._id,
        });
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          taskId: task._id,
          agent: "orchestrator",
          level: "info",
          message: `Task sent to inbox for approval: ${autonomyDecision.reason}`,
        });
        continue;
      }

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        taskId: task._id,
        agent: "orchestrator",
        level: "action",
        message: `Dispatching task: ${task.title}`,
        details: `Adapter: ${task.assignedAgent} | Priority: ${task.priority}`,
      });

      dispatched++;

      // Route to the appropriate agent based on assignedAgent
      switch (task.assignedAgent) {
        case "dev":
          await ctx.scheduler.runAfter(
            0,
            internal.autopilot.execution.executeTask,
            {
              organizationId: args.organizationId,
              taskId: task._id,
            }
          );
          break;

        case "cto":
          await ctx.scheduler.runAfter(
            0,
            internal.autopilot.agents.cto.runCTOSpecGeneration,
            {
              organizationId: args.organizationId,
              taskId: task._id,
            }
          );
          break;

        case "security":
          await runAgentWithTaskLifecycle(ctx, {
            organizationId: args.organizationId,
            taskId: task._id,
            agentName: "security",
            action: () =>
              ctx.runAction(
                internal.autopilot.agents.security.runSecurityScan,
                {
                  organizationId: args.organizationId,
                  triggerReason: "on_demand",
                }
              ),
          });
          break;

        case "architect":
          await runAgentWithTaskLifecycle(ctx, {
            organizationId: args.organizationId,
            taskId: task._id,
            agentName: "architect",
            action: () =>
              ctx.runAction(
                internal.autopilot.agents.architect.runArchitectReview,
                {
                  organizationId: args.organizationId,
                  triggerReason: "on_demand",
                }
              ),
          });
          break;

        case "growth":
          await runAgentWithTaskLifecycle(ctx, {
            organizationId: args.organizationId,
            taskId: task._id,
            agentName: "growth",
            action: () =>
              ctx.runAction(
                internal.autopilot.agents.growth.runGrowthGeneration,
                {
                  organizationId: args.organizationId,
                  triggerReason: "task_completed",
                }
              ),
          });
          break;

        case "support":
          await runAgentWithTaskLifecycle(ctx, {
            organizationId: args.organizationId,
            taskId: task._id,
            agentName: "support",
            action: () =>
              ctx.runAction(
                internal.autopilot.agents.support.runSupportTriage,
                { organizationId: args.organizationId }
              ),
          });
          break;

        case "analytics":
          await runAgentWithTaskLifecycle(ctx, {
            organizationId: args.organizationId,
            taskId: task._id,
            agentName: "analytics",
            action: () =>
              ctx.runAction(
                internal.autopilot.agents.analytics.captureAnalyticsSnapshot,
                { organizationId: args.organizationId }
              ),
          });
          break;

        case "docs":
          await runAgentWithTaskLifecycle(ctx, {
            organizationId: args.organizationId,
            taskId: task._id,
            agentName: "docs",
            action: () =>
              ctx.runAction(internal.autopilot.agents.docs.runDocsCheck, {
                organizationId: args.organizationId,
              }),
          });
          break;

        case "qa":
          await runAgentWithTaskLifecycle(ctx, {
            organizationId: args.organizationId,
            taskId: task._id,
            agentName: "qa",
            action: () =>
              ctx.runAction(internal.autopilot.agents.qa.generateE2ETests, {
                organizationId: args.organizationId,
                taskId: task._id,
              }),
          });
          break;

        case "ops":
          await runAgentWithTaskLifecycle(ctx, {
            organizationId: args.organizationId,
            taskId: task._id,
            agentName: "ops",
            action: () =>
              ctx.runAction(internal.autopilot.agents.ops.monitorDeployments, {
                organizationId: args.organizationId,
              }),
          });
          break;

        case "sales":
          await runAgentWithTaskLifecycle(ctx, {
            organizationId: args.organizationId,
            taskId: task._id,
            agentName: "sales",
            action: () =>
              ctx.runAction(internal.autopilot.agents.sales.runSalesFollowUp, {
                organizationId: args.organizationId,
              }),
          });
          break;

        default:
          await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
            taskId: task._id,
            status: "in_progress",
          });
          await ctx.runMutation(internal.autopilot.tasks.logActivity, {
            organizationId: args.organizationId,
            taskId: task._id,
            agent: task.assignedAgent,
            level: "info",
            message: `Task picked up by ${task.assignedAgent} agent`,
          });
          break;
      }
    }
  },
});

// ============================================
// SCHEDULED CRON HANDLERS
// ============================================

/**
 * Get all enabled autopilot orgs that are not stopped (for cron handlers).
 */
export const getEnabledOrgs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("autopilotConfig").collect();
    return configs
      .filter(
        (c) => c.enabled && (c.autonomyMode ?? "supervised") !== "stopped"
      )
      .map((c) => ({ organizationId: c.organizationId }));
  },
});

/**
 * Run daily CEO reports for all enabled orgs.
 */
export const runDailyCEOReports = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        await ctx.runAction(internal.autopilot.agents.ceo.generateCEOReport, {
          organizationId: org.organizationId,
          reportType: "daily",
        });
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Run weekly CEO reports for all enabled orgs.
 */
export const runWeeklyCEOReports = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        await ctx.runAction(internal.autopilot.agents.ceo.generateCEOReport, {
          organizationId: org.organizationId,
          reportType: "weekly",
        });
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Run daily security scans for all enabled orgs.
 */
export const runDailySecurityScans = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "security" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(
          internal.autopilot.agents.security.runSecurityScan,
          {
            organizationId: org.organizationId,
            triggerReason: "daily_scan",
          }
        );
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Run weekly architect reviews for all enabled orgs.
 */
export const runWeeklyArchitectReviews = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "architect" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(
          internal.autopilot.agents.architect.runArchitectReview,
          {
            organizationId: org.organizationId,
            triggerReason: "weekly_scan",
          }
        );
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Expire old inbox items for all enabled orgs.
 */
export const runInboxExpiration = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        await ctx.runMutation(internal.autopilot.inbox.expireOldItems, {
          organizationId: org.organizationId,
        });
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Run PM analysis for all enabled orgs.
 * Scans feedback and intelligence to create prioritized tasks,
 * ensuring agents have work to do when autopilot is enabled.
 */
export const runPMAnalysis = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "pm" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(internal.autopilot.agents.pm.runPMAnalysis, {
          organizationId: org.organizationId,
        });
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

// ============================================
// V5 AGENT CRON HANDLERS
// ============================================

/**
 * Run support triage for all enabled orgs.
 */
export const runSupportTriage = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "support" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(
          internal.autopilot.agents.support.runSupportTriage,
          { organizationId: org.organizationId }
        );
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Run shipped feature notifications for all enabled orgs.
 * Checks recently completed tasks and notifies linked feedback authors.
 */
export const runShippedNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "support" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(
          internal.autopilot.agents.support.notifyFeatureShipped,
          { organizationId: org.organizationId }
        );
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Capture daily analytics snapshot for all enabled orgs.
 */
export const runAnalyticsSnapshot = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "analytics" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(
          internal.autopilot.agents.analytics.captureAnalyticsSnapshot,
          { organizationId: org.organizationId }
        );
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Generate weekly analytics brief for all enabled orgs.
 */
export const runAnalyticsBrief = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "analytics" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(
          internal.autopilot.agents.analytics.runAnalyticsBrief,
          { organizationId: org.organizationId }
        );
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Run docs stale check for all enabled orgs.
 */
export const runDocsStaleCheck = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "docs" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(internal.autopilot.agents.docs.runDocsStaleCheck, {
          organizationId: org.organizationId,
        });
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Run ops deployment monitoring for all enabled orgs.
 */
export const runOpsMonitoring = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "ops" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(internal.autopilot.agents.ops.monitorDeployments, {
          organizationId: org.organizationId,
        });
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Capture daily ops snapshot for all enabled orgs.
 */
export const runOpsSnapshot = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "ops" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(internal.autopilot.agents.ops.captureOpsSnapshot, {
          organizationId: org.organizationId,
        });
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

// ============================================
// V6 CRON HANDLERS
// ============================================

/**
 * Run sales follow-up check for all enabled orgs.
 */
export const runSalesFollowUp = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: org.organizationId, agent: "sales" }
        );
        if (!enabled) {
          continue;
        }
        await ctx.runAction(internal.autopilot.agents.sales.runSalesFollowUp, {
          organizationId: org.organizationId,
        });
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});

/**
 * Run CEO coordination loop for all enabled orgs.
 * Cross-agent health check, conflict detection, and proactive alerts.
 */
export const runCEOCoordination = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        await ctx.runAction(internal.autopilot.agents.ceo.runCEOCoordination, {
          organizationId: org.organizationId,
        });
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});
