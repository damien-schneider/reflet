import type { z } from "zod";
import {
  createProviderParseFailure,
  createProviderStatusFailure,
  formatProviderHttpError,
  getClosedPullRequestStatus,
  getPullRequestCiStatus,
  githubCommentsResponseSchema,
  githubIssueResponseSchema,
  githubPullsResponseSchema,
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

const CLAUDE_REF_REGEX =
  /^claude:(?<owner>[^/]+)\/(?<repo>[^#]+)#(?<issue>\d+)$/;

export const claudeCodeAdapter: CodingAdapter = {
  name: "claude_code",
  displayName: "Claude Code (Anthropic)",
  requiredCredentials: ["anthropicApiKey", "githubToken"],

  executeTask: async (
    input: CodingTaskInput,
    credentials: Record<string, string>
  ): Promise<CodingTaskOutput> => {
    const { githubToken } = credentials;
    const logs: ActivityLogEntry[] = [];

    try {
      const { owner, repo } = parseRepoUrl(input.repoUrl);
      logs.push(
        log("dev", "info", `Delegating to Claude Code on ${owner}/${repo}`)
      );

      const issueBody = [
        "@claude",
        "",
        "## Task",
        "",
        input.technicalSpec,
        "",
        "## Acceptance Criteria",
        "",
        ...input.acceptanceCriteria.map((c) => `- [ ] ${c}`),
        "",
        "## Instructions",
        "",
        "1. Follow all rules in `AGENTS.md`",
        `2. Create your changes on branch \`${input.featureBranch}\` from \`${input.baseBranch}\``,
        "3. Run `bun x ultracite fix` before committing",
        "4. Run `bun run check-types` to verify type safety",
        "5. Create a draft PR when done",
        "",
        "---",
        "*Created by Reflet Autopilot — Claude Code adapter*",
      ].join("\n");

      logs.push(log("dev", "action", "Creating GitHub Issue with @claude..."));

      const issueResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/issues`,
        {
          method: "POST",
          headers: buildHeaders(githubToken),
          body: JSON.stringify({
            title: `[autopilot] ${input.title}`,
            body: issueBody,
            labels: ["autopilot", "claude-code"],
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

      logs.push(log("dev", "action", "Triggering Claude Code workflow..."));

      const dispatchResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/claude.yml/dispatches`,
        {
          method: "POST",
          headers: buildHeaders(githubToken),
          body: JSON.stringify({
            ref: input.baseBranch,
            inputs: {
              issue_number: String(issueData.number),
            },
          }),
        }
      );

      if (dispatchResponse.ok) {
        logs.push(log("dev", "success", "Claude Code workflow triggered"));
      } else {
        logs.push(
          log(
            "dev",
            "info",
            "Workflow dispatch not available — @claude mention will trigger the action"
          )
        );
      }

      return {
        status: "pending",
        activityLogs: logs,
        tokensUsed: 0,
        estimatedCostUsd: 0,
        externalRef: `claude:${owner}/${repo}#${issueData.number}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logs.push(
        log("dev", "error", `Claude Code delegation failed: ${errorMessage}`)
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

    const match = externalRef.match(CLAUDE_REF_REGEX);
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

    const commentsResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues/${issue}/comments?per_page=5&sort=created&direction=desc`,
      { headers: buildHeaders(githubToken) }
    );

    if (commentsResponse.ok) {
      let comments: z.infer<typeof githubCommentsResponseSchema>;
      try {
        comments = await parseResponseJson(
          commentsResponse,
          githubCommentsResponseSchema,
          "GitHub issue comments"
        );
      } catch (error) {
        logs.push(
          log(
            "system",
            "warning",
            "Could not parse Claude Code issue comments",
            error instanceof Error ? error.message : "Unknown parse error"
          )
        );
        comments = [];
      }

      const claudeComments = comments.filter(
        (c) =>
          c.user.login.includes("claude") ||
          c.user.login.includes("github-actions")
      );

      for (const comment of claudeComments.slice(0, 3)) {
        logs.push(
          log(
            "dev",
            "info",
            `Claude: ${comment.body.slice(0, 200)}`,
            comment.created_at
          )
        );
      }
    }

    const prResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=all&sort=created&direction=desc&per_page=50`,
      { headers: buildHeaders(githubToken) }
    );

    if (!prResponse.ok) {
      return createProviderStatusFailure("Claude Code", prResponse, logs);
    }

    let pulls: z.infer<typeof githubPullsResponseSchema>;
    try {
      pulls = await parseResponseJson(
        prResponse,
        githubPullsResponseSchema,
        "GitHub pull requests"
      );
    } catch (error) {
      return createProviderParseFailure("Claude Code", "PR list", error, logs);
    }

    const linkedPR = pulls.find((pr) => isPullRequestLinkedToIssue(pr, issue));

    if (!linkedPR) {
      return {
        status: "running",
        activityLogs:
          logs.length > 0
            ? logs
            : [log("dev", "info", "Claude Code is working — no PR yet")],
        tokensUsed: 0,
        estimatedCostUsd: 0,
      };
    }

    logs.push(
      log(
        "dev",
        "success",
        `Claude Code opened PR #${linkedPR.number}`,
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
      adapterName: "Claude Code",
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
    const match = externalRef.match(CLAUDE_REF_REGEX);
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
      const ghResponse = await fetch(`${GITHUB_API}/user`, {
        headers: buildHeaders(credentials.githubToken),
      });
      if (!ghResponse.ok) {
        return false;
      }

      const anthropicResponse = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "x-api-key": credentials.anthropicApiKey,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
        }
      );
      return anthropicResponse.status !== 401;
    } catch {
      return false;
    }
  },
};
