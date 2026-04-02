/**
 * Autopilot orchestrator — the cron that drives the task pipeline.
 *
 * Runs periodically to dispatch pending tasks to the appropriate adapter.
 * Follows the intelligence module pattern: scan orgs → dispatch per org.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";

// ============================================
// QUERIES
// ============================================

/**
 * Find all organizations with autopilot enabled and pending tasks.
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

// ============================================
// ACTIONS
// ============================================

/**
 * Main orchestrator entry point — called by the cron scheduler.
 *
 * For each org with autopilot enabled and pending tasks:
 *   1. Check if throttle allows dispatch
 *   2. Get dispatchable tasks (pending + unblocked)
 *   3. Dispatch up to the throttle limit
 */
export const runOrchestrator = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgsWithWork = await ctx.runQuery(
      internal.autopilot.crons.getOrgsWithPendingWork
    );

    if (orgsWithWork.length === 0) {
      return;
    }

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
  },
});

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
    const tasks = await ctx.runQuery(
      internal.autopilot.tasks.getDispatchableTasks,
      { organizationId: args.organizationId }
    );

    if (tasks.length === 0) {
      return;
    }

    // Dispatch the highest priority task
    // We dispatch one at a time to respect the throttle and allow
    // inter-task dependencies to resolve
    const task = tasks[0];

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      taskId: task._id,
      agent: "orchestrator",
      level: "action",
      message: `Dispatching task: ${task.title}`,
      details: `Adapter: ${task.assignedAgent} | Priority: ${task.priority}`,
    });

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
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: task._id,
          status: "in_progress",
        });
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.agents.security.runSecurityScan,
          {
            organizationId: args.organizationId,
            triggerReason: "on_demand",
          }
        );
        break;

      case "architect":
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: task._id,
          status: "in_progress",
        });
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.agents.architect.runArchitectReview,
          {
            organizationId: args.organizationId,
            triggerReason: "on_demand",
          }
        );
        break;

      case "growth":
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: task._id,
          status: "in_progress",
        });
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.agents.growth.runGrowthGeneration,
          {
            organizationId: args.organizationId,
            triggerReason: "task_completed",
          }
        );
        break;

      default:
        // PM and orchestrator tasks are handled by their own crons
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
  },
});

// ============================================
// SCHEDULED CRON HANDLERS
// ============================================

/**
 * Get all enabled autopilot orgs (for cron handlers).
 */
export const getEnabledOrgs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("autopilotConfig").collect();
    return configs
      .filter((c) => c.enabled)
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
