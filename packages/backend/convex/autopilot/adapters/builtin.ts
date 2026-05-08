/**
 * Built-in coding adapter using AI SDK v6 + GitHub API.
 *
 * This is the default adapter that works out of the box.
 * GitHub API helpers are in ./builtin_github.ts.
 */

import type { z } from "zod";
import {
  createProviderParseFailure,
  githubPullDetailResponseSchema,
  parseResponseJson,
} from "./adapter_helpers";
import { BUILTIN_REF_REGEX, buildHeaders, getCIStatus } from "./builtin_github";
import type {
  ActivityLogEntry,
  CodingAdapter,
  CodingTaskInput,
  CodingTaskOutput,
  TaskStatusResponse,
} from "./types";

const GITHUB_API = "https://api.github.com";
const BUILTIN_EXECUTION_UNAVAILABLE =
  "Built-in adapter does not implement code. Configure Codex, Claude Code, or Copilot before dispatching production dev work.";

const log = (
  agent: ActivityLogEntry["agent"],
  level: ActivityLogEntry["level"],
  message: string,
  details?: string
): ActivityLogEntry => ({
  agent,
  level,
  message,
  details,
  timestamp: Date.now(),
});

export const builtinAdapter: CodingAdapter = {
  name: "builtin",
  displayName: "Built-in (AI SDK + GitHub API)",
  requiredCredentials: ["githubToken"],

  executeTask: async (input: CodingTaskInput): Promise<CodingTaskOutput> => ({
    status: "failed",
    activityLogs: [
      log(
        "dev",
        "error",
        `Built-in adapter cannot execute "${input.title}"`,
        BUILTIN_EXECUTION_UNAVAILABLE
      ),
    ],
    tokensUsed: 0,
    estimatedCostUsd: 0,
    errorMessage: BUILTIN_EXECUTION_UNAVAILABLE,
  }),

  getStatus: async (
    externalRef: string,
    credentials: Record<string, string>
  ): Promise<TaskStatusResponse> => {
    const { githubToken } = credentials;

    // Parse externalRef: "builtin:owner/repo#prNumber"
    const match = externalRef.match(BUILTIN_REF_REGEX);
    if (!match?.groups) {
      return {
        status: "failed",
        activityLogs: [],
        tokensUsed: 0,
        estimatedCostUsd: 0,
      };
    }

    const { owner, repo, pr } = match.groups;

    // Check PR status
    const prResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls/${pr}`,
      { headers: buildHeaders(githubToken) }
    );

    if (!prResponse.ok) {
      return {
        status: "failed",
        activityLogs: [],
        tokensUsed: 0,
        estimatedCostUsd: 0,
      };
    }

    let prData: z.infer<typeof githubPullDetailResponseSchema>;
    try {
      prData = await parseResponseJson(
        prResponse,
        githubPullDetailResponseSchema,
        "GitHub pull request"
      );
    } catch (error) {
      return createProviderParseFailure("Built-in", "pull request", error);
    }

    if (prData.merged) {
      return {
        status: "completed",
        prUrl: prData.html_url,
        prNumber: prData.number,
        ciStatus: "passed",
        activityLogs: [],
        tokensUsed: 0,
        estimatedCostUsd: 0,
      };
    }

    // Check CI
    const ci = await getCIStatus(owner, repo, prData.head.ref, githubToken);

    return {
      status: ci.status === "failed" ? "failed" : "running",
      prUrl: prData.html_url,
      prNumber: prData.number,
      ciStatus: ci.status,
      ciFailureLog: ci.failureLog,
      activityLogs: [],
      tokensUsed: 0,
      estimatedCostUsd: 0,
    };
  },

  cancelTask: async (
    externalRef: string,
    credentials: Record<string, string>
  ): Promise<void> => {
    const match = externalRef.match(BUILTIN_REF_REGEX);
    if (!match?.groups) {
      return; // Can't parse ref — nothing to cancel
    }
    const { owner, repo, pr } = match.groups;
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls/${pr}`,
      {
        method: "PATCH",
        headers: {
          ...buildHeaders(credentials.githubToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state: "closed" }),
      }
    );
    if (!response.ok && response.status !== 422) {
      throw new Error(`Failed to close PR #${pr}: ${response.status}`);
    }
  },

  validateCredentials: async (
    credentials: Record<string, string>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${GITHUB_API}/user`, {
        headers: buildHeaders(credentials.githubToken),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
