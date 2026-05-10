/**
 * Task execution — dispatches work items to the selected coding adapter.
 *
 * This is the bridge between the heartbeat scheduler and the
 * provider-agnostic adapter layer.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, internalAction } from "../_generated/server";
import {
  fetchAgentsMd,
  getRequiredTask,
  handleTaskResult,
  isAutopilotConfigStopped,
  parseAdapterCredentials,
  resolveCompletedAt,
  resolveRetryDelayMs,
  resolveRunStatus,
} from "./execution_policy";

async function pauseTaskForSetupIssue(
  ctx: ActionCtx,
  args: {
    organizationId: Id<"organizations">;
    taskId: Id<"autopilotWorkItems">;
    message: string;
  }
) {
  await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
    taskId: args.taskId,
    status: "backlog",
    errorMessage: args.message,
  });
  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId: args.organizationId,
    workItemId: args.taskId,
    agent: "system",
    level: "warning",
    message: args.message,
  });
}

/**
 * Execute a coding task using the org's configured adapter.
 */
export const executeTask = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });

    const task = await getRequiredTask(ctx, args.taskId);
    if (task.organizationId !== args.organizationId) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: task.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message: "Execution stopped: work item belongs to another organization",
      });
      return null;
    }

    if (!config || isAutopilotConfigStopped(config)) {
      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "backlog",
          errorMessage: "Autopilot is disabled",
        }
      );
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message: "Autopilot is disabled — task not executed",
      });
      return null;
    }

    const billingAccess = await ctx.runQuery(
      internal.autopilot.billing_gate.checkAccess,
      { organizationId: args.organizationId }
    );
    if (!billingAccess.allowed) {
      const reason =
        billingAccess.reason ?? "Autopilot requires a Pro subscription.";
      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "backlog",
          errorMessage: reason,
        }
      );
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message: reason,
      });
      return null;
    }

    const previousRuns = await ctx.runQuery(
      internal.autopilot.task_queries.getRunsForTask,
      { taskId: args.taskId }
    );
    const retryCount = previousRuns.filter(
      (run: { status: string }) => run.status === "failed"
    ).length;

    const creds = await ctx.runQuery(
      internal.autopilot.config.getAdapterCredentials,
      { organizationId: args.organizationId, adapter: config.adapter }
    );

    if (!creds) {
      await pauseTaskForSetupIssue(ctx, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        message:
          "Execution paused: adapter credentials missing. Add valid adapter credentials before retrying this task.",
      });
      return null;
    }

    let runId: Id<"autopilotRuns"> | null = null;

    try {
      const { getAdapter } = await import("./adapters/registry");
      const adapter = getAdapter(config.adapter);
      const credentials = parseAdapterCredentials(creds.credentials);

      const credentialsValid = await adapter.validateCredentials(credentials);
      if (!credentialsValid) {
        await pauseTaskForSetupIssue(ctx, {
          organizationId: args.organizationId,
          taskId: args.taskId,
          message:
            "Execution paused: adapter credentials are invalid. Reconnect the adapter credentials before retrying this task.",
        });
        return null;
      }

      const reservation = await ctx.runMutation(
        internal.autopilot.config_mutations.reserveTaskExecution,
        { organizationId: args.organizationId }
      );
      if (!reservation.allowed) {
        await ctx.runMutation(
          internal.autopilot.task_mutations.updateTaskStatus,
          {
            taskId: args.taskId,
            status: "backlog",
            errorMessage: reservation.reason,
          }
        );
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          workItemId: args.taskId,
          agent: "system",
          level: "warning",
          message: reservation.reason ?? "Task execution paused",
        });
        return null;
      }

      const createdRunId = await ctx.runMutation(
        internal.autopilot.task_mutations.createRun,
        {
          organizationId: args.organizationId,
          taskId: args.taskId,
          adapter: config.adapter,
        }
      );
      runId = createdRunId;

      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "in_progress",
        }
      );

      const agentsMdContent = await fetchAgentsMd(credentials);
      const repoUrl = credentials.repoUrl ?? "";

      const result = await adapter.executeTask(
        {
          repoUrl,
          baseBranch: credentials.baseBranch ?? "main",
          title: task.title,
          technicalSpec: task.description,
          acceptanceCriteria: task.acceptanceCriteria ?? [],
          agentsMdContent,
          featureBranch: `autopilot/${task._id}`,
        },
        credentials
      );

      for (const logEntry of result.activityLogs) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          workItemId: args.taskId,
          runId: createdRunId,
          agent: logEntry.agent,
          level: logEntry.level,
          message: logEntry.message,
          details: logEntry.details,
        });
      }

      await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
        runId: createdRunId,
        status: resolveRunStatus(result.status),
        externalRef: result.externalRef,
        branch: result.branch,
        prUrl: result.prUrl,
        prNumber: result.prNumber,
        tokensUsed: result.tokensUsed,
        estimatedCostUsd: result.estimatedCostUsd,
        errorMessage: result.errorMessage,
        completedAt: resolveCompletedAt(result.status),
      });

      await handleTaskResult(ctx, {
        result,
        taskId: args.taskId,
        organizationId: args.organizationId,
        runId: createdRunId,
        adapter: config.adapter,
        retryCount,
        maxRetries: 3,
      });
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown execution error";

      if (runId !== null) {
        await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
          runId,
          status: "failed",
          errorMessage,
          completedAt: Date.now(),
        });
      }

      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "backlog",
        }
      );
      const retryDelay = resolveRetryDelayMs({ retryCount });
      if (retryDelay !== null) {
        await ctx.scheduler.runAfter(
          retryDelay,
          internal.autopilot.execution.retryTask,
          { organizationId: args.organizationId, taskId: args.taskId }
        );
        return null;
      }

      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "cancelled",
        }
      );
      return null;
    }
  },
});

/**
 * Retry a work item after backoff delay.
 */
export const retryTask = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
      taskId: args.taskId,
    });

    if (!task || task.status === "cancelled") {
      return null;
    }

    if (task.organizationId !== args.organizationId) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: task.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message: "Retry stopped: work item belongs to another organization",
      });
      return null;
    }

    await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId: args.taskId,
      status: "todo",
    });

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      workItemId: args.taskId,
      agent: "system",
      level: "info",
      message: "Re-queued after backoff",
    });
    return null;
  },
});
