/**
 * Task execution — dispatches tasks to the selected coding adapter.
 *
 * This is the bridge between the Convex orchestrator and the
 * provider-agnostic adapter layer.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
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
): "completed" | "waiting_review" =>
  autonomyLevel === "full_auto" ? "completed" : "waiting_review";

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
    taskId: Id<"autopilotTasks">;
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
    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId,
      status: resolveCompletionStatus(autonomyLevel),
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      tokensUsed: result.tokensUsed,
      estimatedCostUsd: result.estimatedCostUsd,
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
    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId,
      status: "pending",
      retryCount: retryCount + 1,
      errorMessage: `Retry ${retryCount + 1}/${maxRetries}: ${result.errorMessage}`,
    });
    return;
  }

  if (result.status === "failed") {
    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId,
      status: "failed",
      errorMessage: result.errorMessage,
      tokensUsed: result.tokensUsed,
      estimatedCostUsd: result.estimatedCostUsd,
    });
  }
};

/**
 * Execute a coding task using the org's configured adapter.
 *
 * Flow:
 *   1. Load org config + adapter credentials
 *   2. Resolve the adapter
 *   3. Build the task input from the autopilot task record
 *   4. Call adapter.executeTask()
 *   5. Store results in the run record
 *   6. Update task status
 *   7. Log all activity
 */
export const executeTask = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotTasks"),
  },
  handler: async (ctx, args) => {
    // Step 1: Load config
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });

    if (!config?.enabled) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        agent: "orchestrator",
        level: "warning",
        message: "Autopilot is disabled — task not executed",
      });
      return;
    }

    // Step 2: Load task
    const task = await ctx.runQuery(internal.autopilot.tasks.getTask, {
      taskId: args.taskId,
    });

    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    // Step 3: Load adapter credentials
    const creds = await ctx.runQuery(
      internal.autopilot.config.getAdapterCredentials,
      { organizationId: args.organizationId, adapter: config.adapter }
    );

    if (!creds) {
      await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "failed",
        errorMessage: `No credentials configured for adapter: ${config.adapter}`,
      });
      return;
    }

    // Step 4: Create a run record
    const runId = await ctx.runMutation(internal.autopilot.tasks.createRun, {
      organizationId: args.organizationId,
      taskId: args.taskId,
      adapter: config.adapter,
    });

    // Step 5: Mark task as in progress
    await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId: args.taskId,
      status: "in_progress",
    });

    // Step 6: Increment daily counter
    await ctx.runMutation(internal.autopilot.config.incrementTaskCounter, {
      organizationId: args.organizationId,
    });

    try {
      // Step 7: Resolve adapter and execute
      const { getAdapter } = await import("./adapters/registry");
      const adapter = getAdapter(config.adapter);
      const credentials = JSON.parse(creds.credentials) as Record<
        string,
        string
      >;

      // Step 7b: Pre-validate credentials
      const credentialsValid = await adapter.validateCredentials(credentials);
      if (!credentialsValid) {
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: args.taskId,
          status: "failed",
          errorMessage: `Invalid credentials for adapter: ${config.adapter} — update in Settings`,
        });
        await ctx.runMutation(internal.autopilot.tasks.updateRun, {
          runId,
          status: "failed",
          errorMessage: "Invalid credentials",
          completedAt: Date.now(),
        });
        return;
      }

      // Load AGENTS.md from the repo for coding conventions
      const agentsMdContent = await fetchAgentsMd(credentials);
      const repoUrl = credentials.repoUrl ?? "";

      const result = await adapter.executeTask(
        {
          repoUrl,
          baseBranch: credentials.baseBranch ?? "main",
          title: task.title,
          technicalSpec: task.technicalSpec ?? task.description,
          acceptanceCriteria: task.acceptanceCriteria ?? [],
          agentsMdContent,
          featureBranch: `autopilot/${task._id}`,
        },
        credentials
      );

      // Step 8: Store activity logs
      for (const logEntry of result.activityLogs) {
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          taskId: args.taskId,
          runId,
          agent: logEntry.agent,
          level: logEntry.level,
          message: logEntry.message,
          details: logEntry.details,
        });
      }

      // Step 9: Update run record
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

      // Step 10: Update task status based on result
      await handleTaskResult(ctx, {
        result,
        taskId: args.taskId,
        organizationId: args.organizationId,
        runId,
        adapter: config.adapter,
        autonomyLevel: config.autonomyLevel,
        retryCount: task.retryCount,
        maxRetries: task.maxRetries,
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
        status: "failed",
        errorMessage,
      });
    }
  },
});

/**
 * Poll for async task completion (Copilot, Codex, Claude Code).
 *
 * Called via ctx.scheduler.runAfter for async adapters.
 * Re-schedules itself until the task completes or fails.
 */
export const pollTaskStatus = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotTasks"),
    runId: v.id("autopilotRuns"),
    externalRef: v.string(),
  },
  handler: async (ctx, args) => {
    const MAX_POLL_DURATION = 30 * 60 * 1000; // 30 minutes max
    const POLL_INTERVAL = 60_000; // 1 minute between polls

    const task = await ctx.runQuery(internal.autopilot.tasks.getTask, {
      taskId: args.taskId,
    });

    if (!task || task.status === "cancelled") {
      return; // Task was cancelled — stop polling
    }

    // Check if we've been polling too long
    if (task.startedAt && Date.now() - task.startedAt > MAX_POLL_DURATION) {
      await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "failed",
        errorMessage: "Timed out waiting for async adapter to complete",
      });
      await ctx.runMutation(internal.autopilot.tasks.updateRun, {
        runId: args.runId,
        status: "failed",
        errorMessage: "Timed out",
        completedAt: Date.now(),
      });
      return;
    }

    // Load config + credentials
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

      // Log any new activity
      for (const logEntry of status.activityLogs) {
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          taskId: args.taskId,
          runId: args.runId,
          agent: logEntry.agent,
          level: logEntry.level,
          message: logEntry.message,
          details: logEntry.details,
        });
      }

      // Update run
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
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: args.taskId,
          status:
            config.autonomyLevel === "full_auto"
              ? "completed"
              : "waiting_review",
          prUrl: status.prUrl,
          prNumber: status.prNumber,
          tokensUsed: status.tokensUsed,
          estimatedCostUsd: status.estimatedCostUsd,
        });
        return; // Done
      }

      if (status.status === "failed") {
        await ctx.runMutation(internal.autopilot.tasks.updateRun, {
          runId: args.runId,
          status: "failed",
          completedAt: Date.now(),
        });
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: args.taskId,
          status: "failed",
          errorMessage: status.ciFailureLog ?? "Adapter reported failure",
        });
        return; // Done
      }

      // Still running — schedule next poll
      await ctx.scheduler.runAfter(
        POLL_INTERVAL,
        internal.autopilot.execution.pollTaskStatus,
        args
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Poll error";
      // Log error but keep polling
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        runId: args.runId,
        agent: "system",
        level: "warning",
        message: `Poll error: ${errorMessage}`,
      });

      // Re-schedule despite error
      await ctx.scheduler.runAfter(
        POLL_INTERVAL,
        internal.autopilot.execution.pollTaskStatus,
        args
      );
    }
  },
});

/**
 * Cancel a running task. Calls the adapter's cancel and updates status.
 */
export const cancelTask = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotTasks"),
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

    // Find active run
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
