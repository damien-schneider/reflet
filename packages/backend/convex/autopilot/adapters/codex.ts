import type { z } from "zod";
import {
  createProviderParseFailure,
  createProviderStatusFailure,
  formatProviderHttpError,
  getClosedPullRequestStatus,
  getPullRequestCiStatus,
  githubIssueResponseSchema,
  githubPullsResponseSchema,
  githubWorkflowRunsResponseSchema,
  isPullRequestLinkedToIssue,
  log,
  parseResponseJson,
} from "./adapter_helpers";
import { buildHeaders, parseRepoUrl } from "./builtin_github";
import type {
  ActivityLogEntry,
  CodingAdapter,
  CodingTaskInput,
  CodingTaskOutput,
  TaskStatusResponse,
} from "./types";

const GITHUB_API = "https://api.github.com";

const CODEX_REF_REGEX = /^codex:(?<owner>[^/]+)\/(?<repo>[^#]+)#(?<issue>\d+)$/;

const getNoPrStatus = async ({
  githubToken,
  logs,
  owner,
  repo,
}: {
  githubToken: string;
  logs: ActivityLogEntry[];
  owner: string;
  repo: string;
}): Promise<TaskStatusResponse> => {
  const runsResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/runs?per_page=5`,
    { headers: buildHeaders(githubToken) }
  );

  if (runsResponse.ok) {
    try {
      const runsData = await parseResponseJson(
        runsResponse,
        githubWorkflowRunsResponseSchema,
        "GitHub workflow runs"
      );
      const codexRun = runsData.workflow_runs.find(
        (run) =>
          run.name.toLowerCase().includes("codex") && run.status !== "completed"
      );
      if (codexRun) {
        logs.push(
          log("dev", "info", `Codex workflow running: ${codexRun.status}`)
        );
      }
    } catch (error) {
      logs.push(
        log(
          "system",
          "warning",
          "Could not parse Codex workflow run status",
          error instanceof Error ? error.message : "Unknown parse error"
        )
      );
    }
  }

  return {
    status: "running",
    activityLogs:
      logs.length > 0
        ? logs
        : [log("dev", "info", "Codex is working — no PR yet")],
    tokensUsed: 0,
    estimatedCostUsd: 0,
  };
};

export const codexAdapter: CodingAdapter = {
  name: "codex",
  displayName: "OpenAI Codex",
  requiredCredentials: ["openaiApiKey", "githubToken"],

  executeTask: async (
    input: CodingTaskInput,
    credentials: Record<string, string>
  ): Promise<CodingTaskOutput> => {
    const { githubToken } = credentials;
    const logs: ActivityLogEntry[] = [];

    try {
      const { owner, repo } = parseRepoUrl(input.repoUrl);
      logs.push(log("dev", "info", `Delegating to Codex on ${owner}/${repo}`));

      // Step 1: Create an issue with the task spec
      const issueBody = [
        "## Codex Task",
        "",
        input.technicalSpec,
        "",
        "## Acceptance Criteria",
        "",
        ...input.acceptanceCriteria.map((c) => `- [ ] ${c}`),
        "",
        "## Instructions",
        "",
        "Follow the coding rules in `AGENTS.md`.",
        `Create changes on branch \`${input.featureBranch}\` from \`${input.baseBranch}\`.`,
        "Run linting and type checking before committing.",
        "",
        "---",
        "*Created by Reflet Autopilot — Codex adapter*",
      ].join("\n");

      logs.push(log("dev", "action", "Creating GitHub Issue for Codex..."));

      const issueResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/issues`,
        {
          method: "POST",
          headers: buildHeaders(githubToken),
          body: JSON.stringify({
            title: `[autopilot] ${input.title}`,
            body: issueBody,
            labels: ["autopilot", "codex"],
          }),
        }
      );

      if (!issueResponse.ok) {
        throw new Error(
          formatProviderHttpError("Create GitHub issue", issueResponse)
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

      // Step 2: Trigger the Codex GitHub Action via workflow dispatch
      logs.push(log("dev", "action", "Triggering Codex workflow dispatch..."));

      const dispatchResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/codex.yml/dispatches`,
        {
          method: "POST",
          headers: buildHeaders(githubToken),
          body: JSON.stringify({
            ref: input.baseBranch,
            inputs: {
              task: input.technicalSpec,
              issue_number: String(issueData.number),
            },
          }),
        }
      );

      if (dispatchResponse.ok) {
        logs.push(log("dev", "success", "Codex workflow triggered"));
      } else {
        // Workflow dispatch may not exist — fall back to issue-only mode
        logs.push(
          log(
            "dev",
            "warning",
            "Could not trigger workflow dispatch — Codex will pick up the issue if configured with triggers"
          )
        );
      }

      return {
        status: "pending",
        activityLogs: logs,
        tokensUsed: 0,
        estimatedCostUsd: 0,
        externalRef: `codex:${owner}/${repo}#${issueData.number}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logs.push(
        log("dev", "error", `Codex delegation failed: ${errorMessage}`)
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
    const { githubToken } = credentials;

    // Parse externalRef: "codex:owner/repo#issueNumber"
    const match = externalRef.match(CODEX_REF_REGEX);
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

    // Check for PRs linked to this issue
    const prResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=all&sort=created&direction=desc&per_page=50`,
      { headers: buildHeaders(githubToken) }
    );

    if (!prResponse.ok) {
      return createProviderStatusFailure("Codex", prResponse);
    }

    let pulls: z.infer<typeof githubPullsResponseSchema>;
    try {
      pulls = await parseResponseJson(
        prResponse,
        githubPullsResponseSchema,
        "GitHub pull requests"
      );
    } catch (error) {
      return createProviderParseFailure("Codex", "PR list", error, logs);
    }

    const linkedPR = pulls.find((pr) => isPullRequestLinkedToIssue(pr, issue));

    if (!linkedPR) {
      return getNoPrStatus({ githubToken, logs, owner, repo });
    }

    logs.push(
      log(
        "dev",
        "success",
        `Codex opened PR #${linkedPR.number}`,
        linkedPR.html_url
      )
    );

    const closedStatus = await getClosedPullRequestStatus({
      activityLogs: logs,
      headers: buildHeaders(githubToken),
      owner,
      pull: linkedPR,
      repo,
    });
    if (closedStatus) {
      return closedStatus;
    }

    return getPullRequestCiStatus({
      activityLogs: logs,
      adapterName: "Codex",
      headers: buildHeaders(githubToken),
      owner,
      pull: linkedPR,
      repo,
    });
  },

  cancelTask: async (
    externalRef: string,
    credentials: Record<string, string>
  ): Promise<void> => {
    const { githubToken } = credentials;
    const match = externalRef.match(CODEX_REF_REGEX);
    if (!match?.groups) {
      return;
    }

    const { owner, repo, issue } = match.groups;

    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issue}`, {
      method: "PATCH",
      headers: buildHeaders(githubToken),
      body: JSON.stringify({ state: "closed" }),
    });
  },

  validateCredentials: async (
    credentials: Record<string, string>
  ): Promise<boolean> => {
    try {
      // Validate GitHub token
      const ghResponse = await fetch(`${GITHUB_API}/user`, {
        headers: buildHeaders(credentials.githubToken),
      });
      if (!ghResponse.ok) {
        return false;
      }

      // Validate OpenAI key
      const oaiResponse = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${credentials.openaiApiKey}` },
      });
      return oaiResponse.ok;
    } catch {
      return false;
    }
  },
};
