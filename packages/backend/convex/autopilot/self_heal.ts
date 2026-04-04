/**
 * Self-Healing — automatically cleans up stuck, orphaned, and unrecoverable tasks.
 *
 * Runs every 10 minutes via cron. Handles:
 *   1. Tasks stuck in_progress > 1 hour with no activity → mark failed
 *   2. Tasks assigned to disabled agents in pending > 1 hour → cancel
 *   3. Tasks with unrecoverable errors → cancel
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

const ONE_HOUR = 60 * 60 * 1000;

/**
 * Unrecoverable error patterns — tasks with these errors will never succeed.
 */
const UNRECOVERABLE_PATTERNS = [
  "No credentials configured for adapter:",
  "Task not found:",
  "Organization not found:",
  "Autopilot is disabled",
] as const;

// ============================================
// QUERIES
// ============================================

/**
 * Find tasks stuck in_progress for longer than the threshold.
 */
export const getStuckInProgressTasks = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    thresholdMs: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotTasks"),
      title: v.string(),
      assignedAgent: v.string(),
      startedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.thresholdMs;

    const inProgressTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    return inProgressTasks
      .filter((t) => {
        const startTime = t.startedAt ?? t.createdAt;
        return startTime < cutoff;
      })
      .map((t) => ({
        _id: t._id,
        title: t.title,
        assignedAgent: t.assignedAgent,
        startedAt: t.startedAt,
      }));
  },
});

/**
 * Find pending tasks assigned to disabled agents that have been waiting > threshold.
 */
export const getOrphanedPendingTasks = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    thresholdMs: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotTasks"),
      title: v.string(),
      assignedAgent: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.thresholdMs;

    const enabledAgents: string[] = await ctx.runQuery(
      internal.autopilot.config.getEnabledAgents,
      { organizationId: args.organizationId }
    );
    const enabledSet = new Set<string>(enabledAgents);

    const pendingTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    return pendingTasks
      .filter((t) => !enabledSet.has(t.assignedAgent) && t.createdAt < cutoff)
      .map((t) => ({
        _id: t._id,
        title: t.title,
        assignedAgent: t.assignedAgent,
      }));
  },
});

/**
 * Find failed tasks with unrecoverable error messages.
 */
export const getUnrecoverableTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotTasks"),
      title: v.string(),
      errorMessage: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const failedTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "failed")
      )
      .collect();

    return failedTasks
      .filter((t) => {
        if (!t.errorMessage) {
          return false;
        }
        return UNRECOVERABLE_PATTERNS.some((pattern) =>
          t.errorMessage?.includes(pattern)
        );
      })
      .map((t) => ({
        _id: t._id,
        title: t.title,
        errorMessage: t.errorMessage,
      }));
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Cancel a task with a reason (used by self-healing).
 */
export const cancelTaskWithReason = internalMutation({
  args: {
    taskId: v.id("autopilotTasks"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return;
    }

    await ctx.db.patch(args.taskId, {
      status: "cancelled",
      errorMessage: args.reason,
      completedAt: Date.now(),
    });
  },
});

/**
 * Fail a task with a reason (used by self-healing for stuck tasks).
 */
export const failTaskWithReason = internalMutation({
  args: {
    taskId: v.id("autopilotTasks"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return;
    }

    await ctx.db.patch(args.taskId, {
      status: "failed",
      errorMessage: args.reason,
      completedAt: Date.now(),
    });
  },
});

/**
 * Find failed tasks that can be retried (retryCount < maxRetries).
 * Excludes tasks with unrecoverable errors.
 */
export const getRetryableTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotTasks"),
      title: v.string(),
      assignedAgent: v.string(),
      retryCount: v.number(),
      maxRetries: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const failedTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "failed")
      )
      .collect();

    return failedTasks
      .filter((t) => {
        const retryCount = t.retryCount ?? 0;
        const maxRetries = t.maxRetries ?? 3;
        if (retryCount >= maxRetries) {
          return false;
        }
        // Skip tasks with unrecoverable errors
        if (t.errorMessage) {
          return !UNRECOVERABLE_PATTERNS.some((p) =>
            t.errorMessage?.includes(p)
          );
        }
        return true;
      })
      .map((t) => ({
        _id: t._id,
        title: t.title,
        assignedAgent: t.assignedAgent,
        retryCount: t.retryCount ?? 0,
        maxRetries: t.maxRetries ?? 3,
      }));
  },
});

/**
 * Reset a failed task to pending and increment retry count.
 */
export const retryTask = internalMutation({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.status !== "failed") {
      return;
    }

    await ctx.db.patch(args.taskId, {
      status: "pending",
      errorMessage: undefined,
      completedAt: undefined,
      startedAt: undefined,
      retryCount: (task.retryCount ?? 0) + 1,
    });
  },
});

// ============================================
// MAIN SELF-HEALING ACTION
// ============================================

/**
 * Run self-healing for all enabled organizations.
 * Called by cron every 10 minutes.
 */
export const runSelfHealing = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.autopilot.crons.getEnabledOrgs);

    for (const org of orgs) {
      try {
        let healed = 0;

        // 1. Tasks stuck in_progress > 1 hour with no activity → mark failed
        const stuckTasks = await ctx.runQuery(
          internal.autopilot.self_heal.getStuckInProgressTasks,
          {
            organizationId: org.organizationId,
            thresholdMs: ONE_HOUR,
          }
        );

        for (const task of stuckTasks) {
          await ctx.runMutation(
            internal.autopilot.self_heal.failTaskWithReason,
            {
              taskId: task._id,
              reason: "Auto-failed: no progress for 1 hour",
            }
          );
          healed++;
        }

        // 2. Tasks assigned to disabled agents in pending > 1 hour → cancel
        const orphanedTasks = await ctx.runQuery(
          internal.autopilot.self_heal.getOrphanedPendingTasks,
          {
            organizationId: org.organizationId,
            thresholdMs: ONE_HOUR,
          }
        );

        for (const task of orphanedTasks) {
          await ctx.runMutation(
            internal.autopilot.self_heal.cancelTaskWithReason,
            {
              taskId: task._id,
              reason: `Auto-cancelled: ${task.assignedAgent} agent is disabled`,
            }
          );
          healed++;
        }

        // 3. Tasks with unrecoverable errors → cancel
        const unrecoverableTasks = await ctx.runQuery(
          internal.autopilot.self_heal.getUnrecoverableTasks,
          { organizationId: org.organizationId }
        );

        for (const task of unrecoverableTasks) {
          await ctx.runMutation(
            internal.autopilot.self_heal.cancelTaskWithReason,
            {
              taskId: task._id,
              reason: `Auto-cancelled: unrecoverable error — ${task.errorMessage ?? "unknown"}`,
            }
          );
          healed++;
        }

        // 4. Retry failed tasks that haven't exhausted retries
        const retryableTasks = await ctx.runQuery(
          internal.autopilot.self_heal.getRetryableTasks,
          { organizationId: org.organizationId }
        );

        let retried = 0;
        for (const task of retryableTasks) {
          await ctx.runMutation(internal.autopilot.self_heal.retryTask, {
            taskId: task._id,
          });
          await ctx.runMutation(internal.autopilot.tasks.logActivity, {
            organizationId: org.organizationId,
            taskId: task._id,
            agent: "system",
            level: "action",
            message: `Auto-retry: ${task.title} (attempt ${task.retryCount + 1}/${task.maxRetries})`,
          });
          retried++;
          healed++;
        }

        // 5. Log ONE summary if anything was healed
        if (healed > 0) {
          await ctx.runMutation(internal.autopilot.tasks.logActivity, {
            organizationId: org.organizationId,
            agent: "system",
            level: "success",
            message: `Self-healing: cleaned up ${healed} tasks`,
            details: `Stuck: ${stuckTasks.length}, Orphaned: ${orphanedTasks.length}, Unrecoverable: ${unrecoverableTasks.length}, Retried: ${retried}`,
          });
        }

        // 6. Auto-dismiss internal alerts clogging the inbox
        await ctx.runMutation(
          internal.autopilot.inbox.autoDismissInternalAlerts,
          { organizationId: org.organizationId }
        );
      } catch {
        // Best effort — continue with other orgs
      }
    }
  },
});
