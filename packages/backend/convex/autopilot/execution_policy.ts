import { z } from "zod";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import type { TaskStatusResponse } from "./adapters/types";

const GITHUB_REPO_URL_REGEX = /github\.com[/:](?<owner>[^/]+)\/(?<repo>[^/.]+)/;
const adapterCredentialsSchema = z.record(z.string(), z.string());
const githubContentsResponseSchema = z.object({ content: z.string() });

export const MAX_EXECUTION_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 5 * 60 * 1000;

export const parseAdapterCredentials = (
  credentialsJson: string
): Record<string, string> =>
  adapterCredentialsSchema.parse(JSON.parse(credentialsJson));

export const resolveCompletionStatus = ({
  merged,
}: {
  merged?: boolean;
}): "done" | "in_review" => (merged === true ? "done" : "in_review");

export const resolveRetryDelayMs = ({
  maxRetries = MAX_EXECUTION_RETRIES,
  retryCount,
}: {
  maxRetries?: number;
  retryCount: number;
}): number | null => {
  if (retryCount >= maxRetries) {
    return null;
  }
  return RETRY_BASE_DELAY_MS * 2 ** retryCount;
};

export const isAutopilotConfigStopped = (
  config:
    | {
        autonomyMode?: string;
        enabled?: boolean;
      }
    | null
    | undefined
): boolean =>
  !config?.enabled || (config.autonomyMode ?? "supervised") === "stopped";

export const recordExecutionCost = async (
  ctx: ActionCtx,
  params: {
    costUsd?: number;
    organizationId: Id<"organizations">;
    taskId: Id<"autopilotWorkItems">;
  }
) => {
  if (!(params.costUsd && params.costUsd > 0)) {
    return;
  }
  await ctx.runMutation(internal.autopilot.cost_guard.recordCost, {
    organizationId: params.organizationId,
    taskId: params.taskId,
    costUsd: params.costUsd,
  });
};

export const isTerminalRunStatus = (
  status: Doc<"autopilotRuns">["status"]
): boolean =>
  status === "completed" || status === "failed" || status === "cancelled";

export const logAndReleasePollingTask = async (
  ctx: ActionCtx,
  params: {
    organizationId: Id<"organizations">;
    reason: string;
    runId: Id<"autopilotRuns">;
    runStatus: "cancelled" | "failed";
    taskId: Id<"autopilotWorkItems">;
    taskStatus: "backlog" | "cancelled";
  }
) => {
  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId: params.organizationId,
    workItemId: params.taskId,
    runId: params.runId,
    agent: "system",
    level: "warning",
    message: params.reason,
  });
  await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
    runId: params.runId,
    status: params.runStatus,
    errorMessage: params.reason,
    completedAt: Date.now(),
  });
  await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
    taskId: params.taskId,
    status: params.taskStatus,
    errorMessage: params.reason,
  });
};

export const resolveRunStatus = (
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

export const resolveCompletedAt = (resultStatus: string): number | undefined =>
  resultStatus === "success" || resultStatus === "failed"
    ? Date.now()
    : undefined;

export const handleTaskResult = async (
  ctx: ActionCtx,
  params: {
    adapter: string;
    maxRetries: number;
    organizationId: Id<"organizations">;
    result: {
      errorMessage?: string;
      estimatedCostUsd?: number;
      externalRef?: string;
      merged?: boolean;
      prNumber?: number;
      prUrl?: string;
      status: string;
      tokensUsed?: number;
    };
    retryCount: number;
    runId: Id<"autopilotRuns">;
    taskId: Id<"autopilotWorkItems">;
  }
) => {
  const {
    adapter,
    maxRetries,
    organizationId,
    result,
    retryCount,
    runId,
    taskId,
  } = params;

  if (result.status === "success") {
    await recordExecutionCost(ctx, {
      organizationId,
      taskId,
      costUsd: result.estimatedCostUsd,
    });
    const status = resolveCompletionStatus({
      merged: result.merged,
    });
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
    await recordExecutionCost(ctx, {
      organizationId,
      taskId,
      costUsd: result.estimatedCostUsd,
    });
    const retryDelay = resolveRetryDelayMs({ maxRetries, retryCount });
    if (retryDelay === null) {
      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        { taskId, status: "cancelled" }
      );
      return;
    }

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
    await recordExecutionCost(ctx, {
      organizationId,
      taskId,
      costUsd: result.estimatedCostUsd,
    });
    await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId,
      status: "cancelled",
    });
  }
};

export const persistProviderStatus = async (
  ctx: ActionCtx,
  params: {
    organizationId: Id<"organizations">;
    runId: Id<"autopilotRuns">;
    status: TaskStatusResponse;
    taskId: Id<"autopilotWorkItems">;
  }
) => {
  for (const logEntry of params.status.activityLogs) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: params.organizationId,
      workItemId: params.taskId,
      runId: params.runId,
      agent: logEntry.agent,
      level: logEntry.level,
      message: logEntry.message,
      details: logEntry.details,
    });
  }

  await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
    runId: params.runId,
    prUrl: params.status.prUrl,
    prNumber: params.status.prNumber,
    ciStatus: params.status.ciStatus,
    ciFailureLog: params.status.ciFailureLog,
    tokensUsed: params.status.tokensUsed,
    estimatedCostUsd: params.status.estimatedCostUsd,
  });
};

export const handleFailedPollingStatus = async (
  ctx: ActionCtx,
  params: {
    organizationId: Id<"organizations">;
    runId: Id<"autopilotRuns">;
    status: TaskStatusResponse;
    taskId: Id<"autopilotWorkItems">;
  }
) => {
  const previousRuns = await ctx.runQuery(
    internal.autopilot.task_queries.getRunsForTask,
    { taskId: params.taskId }
  );
  const retryCount = previousRuns.filter(
    (run) => run.status === "failed"
  ).length;
  await recordExecutionCost(ctx, {
    organizationId: params.organizationId,
    taskId: params.taskId,
    costUsd: params.status.estimatedCostUsd,
  });
  await ctx.runMutation(internal.autopilot.task_mutations.updateRun, {
    runId: params.runId,
    status: "failed",
    completedAt: Date.now(),
  });
  await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
    taskId: params.taskId,
    status: "backlog",
  });
  const retryDelay = resolveRetryDelayMs({ retryCount });
  if (retryDelay !== null) {
    await ctx.scheduler.runAfter(
      retryDelay,
      internal.autopilot.execution.retryTask,
      { organizationId: params.organizationId, taskId: params.taskId }
    );
    return;
  }
  await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
    taskId: params.taskId,
    status: "cancelled",
  });
};

export const getRequiredTask = async (
  ctx: ActionCtx,
  taskId: Id<"autopilotWorkItems">
): Promise<Doc<"autopilotWorkItems">> => {
  const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
    taskId,
  });

  if (!task) {
    throw new Error(`Work item not found: ${taskId}`);
  }

  return task;
};

export const fetchAgentsMd = async (
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

    if (!response.ok) {
      return "";
    }

    const data = githubContentsResponseSchema.safeParse(await response.json());
    if (!data.success) {
      return "";
    }
    return atob(data.data.content.replace(/\n/g, ""));
  } catch {
    // AGENTS.md may not exist — continue without it.
    return "";
  }
};
