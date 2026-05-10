/**
 * Built-in coding adapter using AI SDK v6 + GitHub API.
 *
 * This is the default adapter that works out of the box.
 * GitHub API helpers are in ./builtin_github.ts.
 */

import type { z } from "zod";
import {
  createProviderParseFailure,
  createProviderStatusFailure,
  githubPullDetailResponseSchema,
  log,
  parseResponseJson,
} from "./adapter_helpers";
import { BUILTIN_REF_REGEX, buildHeaders, getCIStatus } from "./builtin_github";
import type {
  CodingAdapter,
  CodingTaskInput,
  CodingTaskOutput,
  TaskStatusResponse,
} from "./types";

const GITHUB_API = "https://api.github.com";
const BUILTIN_EXECUTION_UNAVAILABLE =
  "Built-in adapter does not implement code. Configure Codex, Claude Code, or Copilot before dispatching production dev work.";

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
      return createProviderStatusFailure("Built-in", prResponse);
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
        merged: true,
        ciStatus: "passed",
        activityLogs: [],
        tokensUsed: 0,
        estimatedCostUsd: 0,
      };
    }

    if (prData.state === "closed") {
      return {
        status: "failed",
        prUrl: prData.html_url,
        prNumber: prData.number,
        merged: false,
        ciStatus: "failed",
        activityLogs: [
          log(
            "dev",
            "error",
            `PR #${prData.number} was closed without merge`,
            prData.html_url
          ),
        ],
        tokensUsed: 0,
        estimatedCostUsd: 0,
      };
    }

    let ci: Awaited<ReturnType<typeof getCIStatus>>;
    try {
      ci = await getCIStatus(owner, repo, prData.head.sha, githubToken);
    } catch (error) {
      return {
        ...createProviderParseFailure("Built-in CI", "check runs", error),
        prUrl: prData.html_url,
        prNumber: prData.number,
      };
    }

    const hasCompleted = ci.status === "passed" && !prData.draft;
    const hasFailed = ci.status === "failed";
    let status: TaskStatusResponse["status"] = "running";
    if (hasCompleted) {
      status = "completed";
    }
    if (hasFailed) {
      status = "failed";
    }

    return {
      status,
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
        headers: buildHeaders(credentials.githubToken),
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
