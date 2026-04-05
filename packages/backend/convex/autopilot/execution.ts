/**
 * Task execution — dispatches work items to the selected coding adapter.
 *
 * This is the bridge between the heartbeat scheduler and the
 * provider-agnostic adapter layer.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalMutation } from "../_generated/server";
import { assignedAgent } from "./schema/validators";

const GITHUB_REPO_URL_REGEX = /github\.com[/:](?<owner>[^/]+)\/(?<repo>[^/.]+)/;

const resolveRunStatus = (
  resultStatus: string
): "completed" | "creating_pr" | "failed" => {
  if (resultStatus === "success") {
    return "completed";
  }
  if (resultStatus === "pending") {
    return "creating_pr";
  }
  return "failed";
};

const resolveCompletionStatus = (
  autonomyLevel: string
): "done" | "in_review" =>
  autonomyLevel === "full_auto" ? "done" : "in_review";

const resolveCompletedAt = (resultStatus: string): number | undefined =>
  resultStatus === "success" || resultStatus === "failed"
    ? Date.now()
    : undefined;

const fetchAgentsMd = async (
  credentials: Record<string, string>
): Promise<string> => {
  const repoUrl = credentials.repoUrl ?? "";
  if (!(repoUrl && credentials.githubToken)) {
    return "";
  }

  try {
    const repoMatch = repoUrl.match(GITHUB_REPO_URL_REGEX);
    if (!repoMatch?.groups) {
      return "";
    }

    const { owner, repo } = repoMatch.groups;
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/AGENTS.md?ref=${credentials.baseBranch ?? "main"}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (response.ok) {
      const data = (await response.json()) as { content: string };
      return atob(data.content.replace(/\n/g, ""));
    }
  } catch {
    // AGENTS.md may not exist — continue without it
  }

  return "";
};

const handleTaskResult = async (
  ctx: ActionCtx,
  params: {
    result: {
      status: string;
      externalRef?: string;
      prUrl?: string;
      prNumber?: number;
      tokensUsed?: number;
      estimatedCostUsd?: number;
      errorMessage?: string;
    };
    taskId: Id<"autopilotWorkItems">;
    organizationId: Id<"organizations">;
    runId: Id<"autopilotRuns">;
    adapter: string;
    autonomyLevel: string;
    retryCount: number;
    maxRetries: number;
  }
) => {
  const {
    result,
    taskId,
    organizationId,
    runId,
    adapter,
    autonomyLevel,
    retryCount,
    maxRetries,
  } = params;

  if (result.status === "success") {
    const status = resolveCompletionStatus(autonomyLevel);
    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId,
      status,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      needsReview: status === "in_review",
      reviewType: status === "in_review" ? "pr_review" : undefined,
    });
    return;
  }

  if (result.status === "pending") {
    if (!result.externalRef) {
      throw new Error(
        `Async adapter ${adapter} returned pending status without an externalRef`
      );
    }
    await ctx.scheduler.runAfter(
      30_000,
      internal.autopilot.execution.pollTaskStatus,
      { organizationId, taskId, runId, externalRef: result.externalRef }
    );
    return;
  }

  if (result.status === "failed" && retryCount < maxRetries) {
    const RETRY_BASE_DELAY_MS = 5 * 60 * 1000;
    const retryDelay = RETRY_BASE_DELAY_MS * 2 ** retryCount;

    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId,
      status: "backlog",
    });

    await ctx.scheduler.runAfter(
      retryDelay,
      internal.autopilot.execution.retryTask,
      { organizationId, taskId }
    );
    return;
  }

  if (result.status === "failed") {
    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId,
      status: "cancelled",
    });
  }
};

/**
 * Execute a coding task using the org's configured adapter.
 */
export const executeTask = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });

    if (!config || (config.autonomyMode ?? "supervised") === "stopped") {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message: "Autopilot is disabled — task not executed",
      });
      return;
    }

    const task = await ctx.runQuery(internal.autopilot.tasks.getTask, {
      taskId: args.taskId,
    });

    if (!task) {
      throw new Error(`Work item not found: ${args.taskId}`);
    }

    const creds = await ctx.runQuery(
      internal.autopilot.config.getAdapterCredentials,
      { organizationId: args.organizationId, adapter: config.adapter }
    );

    if (!creds) {
      await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "cancelled",
      });
      return;
    }

    const runId = await ctx.runMutation(internal.autopilot.tasks.createRun, {
      organizationId: args.organizationId,
      taskId: args.taskId,
      adapter: config.adapter,
    });

    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId: args.taskId,
      status: "in_progress",
    });

    await ctx.runMutation(internal.autopilot.config.incrementTaskCounter, {
      organizationId: args.organizationId,
    });

    try {
      const { getAdapter } = await import("./adapters/registry");
      const adapter = getAdapter(config.adapter);
      const credentials = JSON.parse(creds.credentials) as Record<
        string,
        string
      >;

      const credentialsValid = await adapter.validateCredentials(credentials);
      if (!credentialsValid) {
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: args.taskId,
          status: "cancelled",
        });
        await ctx.runMutation(internal.autopilot.tasks.updateRun, {
          runId,
          status: "failed",
          errorMessage: "Invalid credentials",
          completedAt: Date.now(),
        });
        return;
      }

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
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          workItemId: args.taskId,
          runId,
          agent: logEntry.agent,
          level: logEntry.level,
          message: logEntry.message,
          details: logEntry.details,
        });
      }

      await ctx.runMutation(internal.autopilot.tasks.updateRun, {
        runId,
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
        runId,
        adapter: config.adapter,
        autonomyLevel: config.autonomyLevel,
        retryCount: 0,
        maxRetries: 3,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown execution error";

      await ctx.runMutation(internal.autopilot.tasks.updateRun, {
        runId,
        status: "failed",
        errorMessage,
        completedAt: Date.now(),
      });

      await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "cancelled",
      });
    }
  },
});

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

    const task = await ctx.runQuery(internal.autopilot.tasks.getTask, {
      taskId: args.taskId,
    });

    if (!task || task.status === "cancelled") {
      return;
    }

    const startedAt = task.updatedAt;
    if (startedAt && Date.now() - startedAt > MAX_POLL_DURATION) {
      await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "cancelled",
      });
      await ctx.runMutation(internal.autopilot.tasks.updateRun, {
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
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          workItemId: args.taskId,
          runId: args.runId,
          agent: logEntry.agent,
          level: logEntry.level,
          message: logEntry.message,
          details: logEntry.details,
        });
      }

      await ctx.runMutation(internal.autopilot.tasks.updateRun, {
        runId: args.runId,
        prUrl: status.prUrl,
        prNumber: status.prNumber,
        ciStatus: status.ciStatus,
        ciFailureLog: status.ciFailureLog,
        tokensUsed: status.tokensUsed,
        estimatedCostUsd: status.estimatedCostUsd,
      });

      if (status.status === "completed") {
        await ctx.runMutation(internal.autopilot.tasks.updateRun, {
          runId: args.runId,
          status: "completed",
          completedAt: Date.now(),
        });
        const completionStatus =
          config.autonomyLevel === "full_auto" ? "done" : "in_review";
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: args.taskId,
          status: completionStatus as "done" | "in_review",
          prUrl: status.prUrl,
          prNumber: status.prNumber,
          needsReview: completionStatus === "in_review",
          reviewType:
            completionStatus === "in_review" ? "pr_review" : undefined,
        });
        return;
      }

      if (status.status === "failed") {
        await ctx.runMutation(internal.autopilot.tasks.updateRun, {
          runId: args.runId,
          status: "failed",
          completedAt: Date.now(),
        });
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: args.taskId,
          status: "cancelled",
        });
        return;
      }

      await ctx.scheduler.runAfter(
        POLL_INTERVAL,
        internal.autopilot.execution.pollTaskStatus,
        args
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Poll error";
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        runId: args.runId,
        agent: "system",
        level: "warning",
        message: `Poll error: ${errorMessage}`,
      });

      await ctx.scheduler.runAfter(
        POLL_INTERVAL,
        internal.autopilot.execution.pollTaskStatus,
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
    const task = await ctx.runQuery(internal.autopilot.tasks.getTask, {
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

    const runs = await ctx.runQuery(internal.autopilot.tasks.getRunsForTask, {
      taskId: args.taskId,
    });
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

      await ctx.runMutation(internal.autopilot.tasks.updateRun, {
        runId: activeRun._id,
        status: "cancelled",
        completedAt: Date.now(),
      });
    }

    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId: args.taskId,
      status: "cancelled",
    });
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
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.autopilot.tasks.getTask, {
      taskId: args.taskId,
    });

    if (!task || task.status === "cancelled") {
      return;
    }

    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId: args.taskId,
      status: "todo",
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      workItemId: args.taskId,
      agent: "system",
      level: "info",
      message: "Re-queued after backoff",
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
