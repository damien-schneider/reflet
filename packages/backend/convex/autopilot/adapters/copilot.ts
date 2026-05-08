/**
 * GitHub Copilot Coding Agent adapter.
 *
 * Delegates coding tasks to GitHub Copilot by creating a GitHub Issue
 * and assigning it to `copilot-swe-agent[bot]`.
 *
 * Copilot handles the full sandbox:
 *   - Clones the repo
 *   - Installs dependencies (customizable via copilot-setup-steps.yml)
 *   - Explores codebase with semantic code search
 *   - Makes changes, runs tests/linters
 *   - Opens a draft PR automatically
 *
 * Requirements:
 *   - GitHub Copilot Business/Enterprise enabled on the repo
 *   - Fine-grained PAT with: actions:write, contents:write, issues:write, pull_requests:write
 *   - Copilot coding agent enabled for the repository
 */

import type { z } from "zod";
import {
  createProviderParseFailure,
  createProviderStatusFailure,
  githubCheckRunsResponseSchema,
  githubIssueResponseSchema,
  githubPullsResponseSchema,
  isPullRequestLinkedToIssue,
  parseGitHubCheckRuns,
  parseResponseJson,
} from "./adapter_helpers";
import type {
  ActivityLogEntry,
  CodingAdapter,
  CodingTaskInput,
  CodingTaskOutput,
  TaskStatusResponse,
} from "./types";

const GITHUB_API = "https://api.github.com";
const COPILOT_ASSIGNEE = "copilot-swe-agent";

const GITHUB_REPO_URL_REGEX = /github\.com[/:](?<owner>[^/]+)\/(?<repo>[^/.]+)/;
const COPILOT_REF_REGEX =
  /^copilot:(?<owner>[^/]+)\/(?<repo>[^#]+)#(?<issue>\d+)$/;

const buildHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

const parseRepoUrl = (repoUrl: string): { owner: string; repo: string } => {
  const match = repoUrl.match(GITHUB_REPO_URL_REGEX);
  if (!match?.groups) {
    throw new Error(`Invalid GitHub repo URL: ${repoUrl}`);
  }
  return { owner: match.groups.owner, repo: match.groups.repo };
};

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

export const copilotAdapter: CodingAdapter = {
  name: "copilot",
  displayName: "GitHub Copilot Coding Agent",
  requiredCredentials: ["githubPat"],

  executeTask: async (
    input: CodingTaskInput,
    credentials: Record<string, string>
  ): Promise<CodingTaskOutput> => {
    const { githubPat } = credentials;
    const logs: ActivityLogEntry[] = [];

    try {
      const { owner, repo } = parseRepoUrl(input.repoUrl);
      logs.push(
        log("dev", "info", `Delegating to Copilot on ${owner}/${repo}`)
      );

      // Step 1: Create a GitHub Issue with the technical spec
      const issueBody = [
        "## Task",
        "",
        input.technicalSpec,
        "",
        "## Acceptance Criteria",
        "",
        ...input.acceptanceCriteria.map((c) => `- [ ] ${c}`),
        "",
        "## Coding Conventions",
        "",
        "Follow the rules in `AGENTS.md` at the project root.",
        "",
        `**Base branch:** \`${input.baseBranch}\``,
        `**Feature branch:** \`${input.featureBranch}\``,
        "",
        "---",
        "*Created by Reflet Autopilot*",
      ].join("\n");

      logs.push(log("dev", "action", "Creating GitHub Issue..."));

      const issueResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/issues`,
        {
          method: "POST",
          headers: buildHeaders(githubPat),
          body: JSON.stringify({
            title: `[autopilot] ${input.title}`,
            body: issueBody,
            labels: ["autopilot", "copilot"],
          }),
        }
      );

      if (!issueResponse.ok) {
        throw new Error(
          `Failed to create issue: ${issueResponse.status} ${await issueResponse.text()}`
        );
      }

      const issueData = await parseResponseJson(
        issueResponse,
        githubIssueResponseSchema,
        "GitHub issue"
      );
      logs.push(
        log(
          "dev",
          "success",
          `Issue #${issueData.number} created`,
          issueData.html_url
        )
      );

      // Step 2: Assign the issue to Copilot
      logs.push(log("dev", "action", "Assigning to copilot-swe-agent..."));

      const assignResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueData.number}/assignees`,
        {
          method: "POST",
          headers: buildHeaders(githubPat),
          body: JSON.stringify({
            assignees: [COPILOT_ASSIGNEE],
          }),
        }
      );

      if (!assignResponse.ok) {
        const errorBody = await assignResponse.text();
        throw new Error(
          `Failed to assign Copilot: ${assignResponse.status} ${errorBody}. ` +
            "Ensure Copilot coding agent is enabled for this repo and the PAT has Copilot access."
        );
      }

      logs.push(
        log(
          "dev",
          "success",
          "Copilot assigned — it will start working shortly",
          "Copilot will analyze the issue, explore the codebase, and open a draft PR."
        )
      );

      return {
        status: "pending",
        activityLogs: logs,
        tokensUsed: 0,
        estimatedCostUsd: 0,
        externalRef: `copilot:${owner}/${repo}#${issueData.number}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logs.push(
        log("dev", "error", `Copilot delegation failed: ${errorMessage}`)
      );
      return {
        status: "failed",
        activityLogs: logs,
        tokensUsed: 0,
        estimatedCostUsd: 0,
        errorMessage,
      };
    }
  },

  getStatus: async (
    externalRef: string,
    credentials: Record<string, string>
  ): Promise<TaskStatusResponse> => {
    const { githubPat } = credentials;

    // Parse externalRef: "copilot:owner/repo#issueNumber"
    const match = externalRef.match(COPILOT_REF_REGEX);
    if (!match?.groups) {
      return {
        status: "failed",
        activityLogs: [
          log("system", "error", `Invalid external ref: ${externalRef}`),
        ],
        tokensUsed: 0,
        estimatedCostUsd: 0,
      };
    }

    const { owner, repo, issue } = match.groups;
    const logs: ActivityLogEntry[] = [];

    // Check if Copilot has opened a PR linked to this issue
    const searchResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=all&sort=created&direction=desc&per_page=50`,
      { headers: buildHeaders(githubPat) }
    );

    if (!searchResponse.ok) {
      return createProviderStatusFailure("Copilot", searchResponse, logs);
    }

    let pulls: z.infer<typeof githubPullsResponseSchema>;
    try {
      pulls = await parseResponseJson(
        searchResponse,
        githubPullsResponseSchema,
        "GitHub pull requests"
      );
    } catch (error) {
      return createProviderParseFailure("Copilot", "PR list", error, logs);
    }

    // Find a PR that references this issue
    const linkedPR = pulls.find((pr) => isPullRequestLinkedToIssue(pr, issue));

    if (!linkedPR) {
      logs.push(log("dev", "info", "Copilot is still working — no PR yet"));
      return {
        status: "running",
        activityLogs: logs,
        tokensUsed: 0,
        estimatedCostUsd: 0,
      };
    }

    logs.push(
      log(
        "dev",
        "success",
        `Copilot opened PR #${linkedPR.number}`,
        linkedPR.html_url
      )
    );

    // Check CI on the PR
    const ciResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/commits/${linkedPR.head.ref}/check-runs`,
      { headers: buildHeaders(githubPat) }
    );

    if (!ciResponse.ok) {
      return createProviderStatusFailure("Copilot CI", ciResponse, logs);
    }

    let ciData: z.infer<typeof githubCheckRunsResponseSchema>;
    try {
      ciData = await parseResponseJson(
        ciResponse,
        githubCheckRunsResponseSchema,
        "GitHub check runs"
      );
    } catch (error) {
      return createProviderParseFailure(
        "Copilot CI",
        "check runs",
        error,
        logs
      );
    }
    const { ciStatus, ciFailureLog } = parseGitHubCheckRuns(ciData.check_runs);

    const isCompleted = ciStatus === "passed" && !linkedPR.draft;
    let status: TaskStatusResponse["status"] = isCompleted
      ? "completed"
      : "running";
    if (ciStatus === "failed") {
      status = "failed";
    }

    return {
      status,
      prUrl: linkedPR.html_url,
      prNumber: linkedPR.number,
      ciStatus,
      ciFailureLog,
      activityLogs: logs,
      tokensUsed: 0,
      estimatedCostUsd: 0,
    };
  },

  cancelTask: async (
    externalRef: string,
    credentials: Record<string, string>
  ): Promise<void> => {
    const { githubPat } = credentials;
    const match = externalRef.match(COPILOT_REF_REGEX);
    if (!match?.groups) {
      return;
    }

    const { owner, repo, issue } = match.groups;

    // Close the issue to stop Copilot from working on it
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issue}`, {
      method: "PATCH",
      headers: buildHeaders(githubPat),
      body: JSON.stringify({ state: "closed" }),
    });
  },

  validateCredentials: async (
    credentials: Record<string, string>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${GITHUB_API}/user`, {
        headers: buildHeaders(credentials.githubPat),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
