/**
 * Execution policy helpers shared by task dispatch and async polling.
 */

import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

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
  autoMergePRs,
  autonomyLevel,
  autonomyMode,
}: {
  autoMergePRs: boolean;
  autonomyLevel: string;
  autonomyMode?: string;
}): "done" | "in_review" => {
  if (
    autoMergePRs &&
    (autonomyMode === "full_auto" || autonomyLevel === "full_auto")
  ) {
    return "done";
  }
  return "in_review";
};

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
