/**
 * Task lifecycle management — polling, cancellation, and work item locking.
 *
 * These functions manage already-dispatched tasks: checking their status
 * with external providers, cancelling them, and locking/releasing work items.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";
import { assignedAgent } from "./schema/validators";

/**
 * Poll for async task completion (Copilot, Codex, Claude Code).
 */
export const pollTaskStatus = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
    runId: v.id("autopilotRuns"),
    externalRef: v.string(),
  },
  handler: async (ctx, args) => {
    const MAX_POLL_DURATION = 30 * 60 * 1000;
    const POLL_INTERVAL = 60_000;

    const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
      taskId: args.taskId,
    });

    if (!task || task.status === "cancelled") {
      return;
    }

    const startedAt = task.updatedAt;
    if (startedAt && Date.now() - startedAt > MAX_POLL_DURATION) {
      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "cancelled",
        }
      );
      await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
        runId: args.runId,
        status: "failed",
        errorMessage: "Timed out",
        completedAt: Date.now(),
      });
      return;
    }

    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });
    if (!config) {
      return;
    }

    const creds = await ctx.runQuery(
      internal.autopilot.config.getAdapterCredentials,
      { organizationId: args.organizationId, adapter: config.adapter }
    );
    if (!creds) {
      return;
    }

    try {
      const { getAdapter } = await import("./adapters/registry");
      const adapter = getAdapter(config.adapter);
      const credentials = JSON.parse(creds.credentials) as Record<
        string,
        string
      >;

      const status = await adapter.getStatus(args.externalRef, credentials);

      for (const logEntry of status.activityLogs) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          workItemId: args.taskId,
          runId: args.runId,
          agent: logEntry.agent,
          level: logEntry.level,
          message: logEntry.message,
          details: logEntry.details,
        });
      }

      await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
        runId: args.runId,
        prUrl: status.prUrl,
        prNumber: status.prNumber,
        ciStatus: status.ciStatus,
        ciFailureLog: status.ciFailureLog,
        tokensUsed: status.tokensUsed,
        estimatedCostUsd: status.estimatedCostUsd,
      });

      if (status.status === "completed") {
        await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
          runId: args.runId,
          status: "completed",
          completedAt: Date.now(),
        });
        const completionStatus =
          config.autonomyLevel === "full_auto" ? "done" : "in_review";
        await ctx.runMutation(
          internal.autopilot.task_mutations.updateTaskStatus,
          {
            taskId: args.taskId,
            status: completionStatus as "done" | "in_review",
            prUrl: status.prUrl,
            prNumber: status.prNumber,
            needsReview: completionStatus === "in_review",
            reviewType:
              completionStatus === "in_review" ? "pr_review" : undefined,
          }
        );
        return;
      }

      if (status.status === "failed") {
        await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
          runId: args.runId,
          status: "failed",
          completedAt: Date.now(),
        });
        await ctx.runMutation(
          internal.autopilot.task_mutations.updateTaskStatus,
          {
            taskId: args.taskId,
            status: "cancelled",
          }
        );
        return;
      }

      await ctx.scheduler.runAfter(
        POLL_INTERVAL,
        internal.autopilot.execution_lifecycle.pollTaskStatus,
        args
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Poll error";
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        runId: args.runId,
        agent: "system",
        level: "warning",
        message: `Poll error: ${errorMessage}`,
      });

      await ctx.scheduler.runAfter(
        POLL_INTERVAL,
        internal.autopilot.execution_lifecycle.pollTaskStatus,
        args
      );
    }
  },
});

/**
 * Cancel a running task.
 */
export const cancelTask = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
      taskId: args.taskId,
    });
    if (!task) {
      return;
    }

    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });
    if (!config) {
      return;
    }

    const runs = await ctx.runQuery(
      internal.autopilot.task_queries.getRunsForTask,
      {
        taskId: args.taskId,
      }
    );
    const activeRun = runs.find(
      (r: Doc<"autopilotRuns">) =>
        r.status !== "completed" &&
        r.status !== "failed" &&
        r.status !== "cancelled"
    );

    if (activeRun?.externalRef) {
      try {
        const creds = await ctx.runQuery(
          internal.autopilot.config.getAdapterCredentials,
          { organizationId: args.organizationId, adapter: config.adapter }
        );
        if (creds) {
          const { getAdapter } = await import("./adapters/registry");
          const adapter = getAdapter(config.adapter);
          const credentials = JSON.parse(creds.credentials) as Record<
            string,
            string
          >;
          await adapter.cancelTask(activeRun.externalRef, credentials);
        }
      } catch {
        // Best effort cancellation
      }

      await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
        runId: activeRun._id,
        status: "cancelled",
        completedAt: Date.now(),
      });
    }

    await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId: args.taskId,
      status: "cancelled",
    });
  },
});

// ============================================
// Work item checkout / locking
// ============================================

/**
 * Atomically lock a work item for an agent.
 */
export const checkoutTask = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    agent: assignedAgent,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      return false;
    }

    // Work items don't have lock fields in the new schema,
    // so we use status as the lock: only "todo" items can be checked out
    if (item.status !== "todo") {
      return false;
    }

    await ctx.db.patch(args.taskId, {
      status: "in_progress",
      assignedAgent: args.agent,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Release a work item (set back to todo).
 */
export const releaseTask = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      return null;
    }

    await ctx.db.patch(args.taskId, {
      status: "todo",
      updatedAt: Date.now(),
    });

    return null;
  },
});
