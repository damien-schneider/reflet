import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";
import {
  handleFailedPollingStatus,
  handleTaskResult,
  isAutopilotConfigStopped,
  isTerminalRunStatus,
  logAndReleasePollingTask,
  parseAdapterCredentials,
  persistProviderStatus,
} from "./execution_policy";
import { assignedAgent } from "./schema/validators";

export const pollTaskStatus = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
    runId: v.id("autopilotRuns"),
    externalRef: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const MAX_POLL_DURATION = 30 * 60 * 1000;
    const POLL_INTERVAL = 60_000;

    const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
      taskId: args.taskId,
    });

    if (!task || task.status === "cancelled" || task.status === "done") {
      return null;
    }
    if (task.organizationId !== args.organizationId) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: task.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message: "Polling stopped: work item belongs to another organization",
      });
      return null;
    }

    const run = await ctx.runQuery(internal.autopilot.task_queries.getRun, {
      runId: args.runId,
    });
    if (!run || isTerminalRunStatus(run.status)) {
      return null;
    }
    if (
      run.organizationId !== args.organizationId ||
      run.workItemId !== args.taskId
    ) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        runId: args.runId,
        agent: "system",
        level: "warning",
        message: "Polling stopped: run does not belong to this work item",
      });
      return null;
    }

    const startedAt = run.startedAt;
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
      return null;
    }

    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });
    if (!config) {
      await logAndReleasePollingTask(ctx, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        runId: args.runId,
        reason: "Polling stopped: autopilot config missing",
        runStatus: "failed",
        taskStatus: "backlog",
      });
      return null;
    }

    if (isAutopilotConfigStopped(config)) {
      await logAndReleasePollingTask(ctx, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        runId: args.runId,
        reason: "Polling stopped: autopilot is disabled",
        runStatus: "cancelled",
        taskStatus: "backlog",
      });
      return null;
    }

    const access = await ctx.runQuery(
      internal.autopilot.billing_gate.checkAccess,
      {
        organizationId: args.organizationId,
      }
    );
    if (!access.allowed) {
      await logAndReleasePollingTask(ctx, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        runId: args.runId,
        reason: access.reason ?? "Autopilot requires a Pro subscription.",
        runStatus: "cancelled",
        taskStatus: "backlog",
      });
      return null;
    }

    const creds = await ctx.runQuery(
      internal.autopilot.config.getAdapterCredentials,
      { organizationId: args.organizationId, adapter: run.adapter }
    );
    if (!creds) {
      await logAndReleasePollingTask(ctx, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        runId: args.runId,
        reason: "Polling stopped: adapter credentials missing",
        runStatus: "failed",
        taskStatus: "backlog",
      });
      return null;
    }

    try {
      const { getAdapter } = await import("./adapters/registry");
      const adapter = getAdapter(run.adapter);
      const credentials = parseAdapterCredentials(creds.credentials);
      const externalRef = run.externalRef ?? args.externalRef;

      const status = await adapter.getStatus(externalRef, credentials);

      await persistProviderStatus(ctx, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        runId: args.runId,
        status,
      });

      if (status.status === "completed") {
        await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
          runId: args.runId,
          status: "completed",
          completedAt: Date.now(),
        });
        await handleTaskResult(ctx, {
          result: {
            status: "success",
            prUrl: status.prUrl,
            prNumber: status.prNumber,
            merged: status.merged,
            tokensUsed: status.tokensUsed,
            estimatedCostUsd: status.estimatedCostUsd,
          },
          taskId: args.taskId,
          organizationId: args.organizationId,
          runId: args.runId,
          adapter: run.adapter,
          retryCount: 0,
          maxRetries: 0,
        });
        return null;
      }

      if (status.status === "failed") {
        await handleFailedPollingStatus(ctx, {
          organizationId: args.organizationId,
          taskId: args.taskId,
          runId: args.runId,
          status,
        });
        return null;
      }

      await ctx.scheduler.runAfter(
        POLL_INTERVAL,
        internal.autopilot.execution_lifecycle.pollTaskStatus,
        args
      );
      return null;
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
      return null;
    }
  },
});

export const cancelTask = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
    finalStatus: v.optional(
      v.union(v.literal("backlog"), v.literal("cancelled"))
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
      taskId: args.taskId,
    });
    if (!task) {
      return null;
    }
    if (task.organizationId !== args.organizationId) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: task.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message:
          "Cancellation stopped: work item belongs to another organization",
      });
      return null;
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

    if (activeRun) {
      try {
        const creds = await ctx.runQuery(
          internal.autopilot.config.getAdapterCredentials,
          { organizationId: args.organizationId, adapter: activeRun.adapter }
        );
        if (creds && activeRun.externalRef) {
          const { getAdapter } = await import("./adapters/registry");
          const adapter = getAdapter(activeRun.adapter);
          const credentials = parseAdapterCredentials(creds.credentials);
          await adapter.cancelTask(activeRun.externalRef, credentials);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown cancellation error";
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          workItemId: args.taskId,
          runId: activeRun._id,
          agent: "system",
          level: "warning",
          message: "Provider cancellation failed",
          details: errorMessage,
        });
      }

      await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
        runId: activeRun._id,
        status: "cancelled",
        completedAt: Date.now(),
      });
    }

    await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId: args.taskId,
      status: args.finalStatus ?? "cancelled",
    });
    return null;
  },
});

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
