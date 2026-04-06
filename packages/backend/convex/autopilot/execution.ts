/**
 * Task execution — dispatches work items to the selected coding adapter.
 *
 * This is the bridge between the heartbeat scheduler and the
 * provider-agnostic adapter layer.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";

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
    await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
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
      internal.autopilot.execution_lifecycle.pollTaskStatus,
      { organizationId, taskId, runId, externalRef: result.externalRef }
    );
    return;
  }

  if (result.status === "failed" && retryCount < maxRetries) {
    const RETRY_BASE_DELAY_MS = 5 * 60 * 1000;
    const retryDelay = RETRY_BASE_DELAY_MS * 2 ** retryCount;

    await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
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
    await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
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
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        workItemId: args.taskId,
        agent: "system",
        level: "warning",
        message: "Autopilot is disabled — task not executed",
      });
      return;
    }

    const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
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
      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "cancelled",
        }
      );
      return;
    }

    const runId = await ctx.runMutation(
      internal.autopilot.task_mutations.createRun,
      {
        organizationId: args.organizationId,
        taskId: args.taskId,
        adapter: config.adapter,
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId: args.taskId,
      status: "in_progress",
    });

    await ctx.runMutation(
      internal.autopilot.config_mutations.incrementTaskCounter,
      {
        organizationId: args.organizationId,
      }
    );

    try {
      const { getAdapter } = await import("./adapters/registry");
      const adapter = getAdapter(config.adapter);
      const credentials = JSON.parse(creds.credentials) as Record<
        string,
        string
      >;

      const credentialsValid = await adapter.validateCredentials(credentials);
      if (!credentialsValid) {
        await ctx.runMutation(
          internal.autopilot.task_mutations.updateTaskStatus,
          {
            taskId: args.taskId,
            status: "cancelled",
          }
        );
        await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
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
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          workItemId: args.taskId,
          runId,
          agent: logEntry.agent,
          level: logEntry.level,
          message: logEntry.message,
          details: logEntry.details,
        });
      }

      await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
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

      await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
        runId,
        status: "failed",
        errorMessage,
        completedAt: Date.now(),
      });

      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "cancelled",
        }
      );
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
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
      taskId: args.taskId,
    });

    if (!task || task.status === "cancelled") {
      return;
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
  },
});
