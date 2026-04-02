/**
 * Claude Code adapter.
 *
 * Delegates coding tasks to Anthropic's Claude Code via the GitHub Action
 * (anthropics/claude-code-action).
 *
 * Claude Code handles the full development lifecycle:
 *   - Clones the repo in a GitHub Actions runner
 *   - Has Read, Write, Edit, Bash, Glob, Grep tools
 *   - Supports subagents for complex multi-file work
 *   - Reads AGENTS.md for project conventions
 *   - Creates PRs with detailed explanations
 *
 * Integration approach:
 *   We create a GitHub Issue and trigger the claude-code workflow dispatch,
 *   or use @claude mention in the issue body if the action is configured
 *   with issue triggers.
 *
 * Requirements:
 *   - Anthropic API key (or Bedrock/Vertex credentials)
 *   - GitHub PAT with actions:write, contents:write, issues:write
 *   - claude-code-action installed in the repo (.github/workflows/claude.yml)
 */

import type {
  ActivityLogEntry,
  CodingAdapter,
  CodingTaskInput,
  CodingTaskOutput,
  TaskStatusResponse,
} from "./types";

const GITHUB_API = "https://api.github.com";

const GITHUB_REPO_URL_REGEX = /github\.com[/:](?<owner>[^/]+)\/(?<repo>[^/.]+)/;
const CLAUDE_REF_REGEX =
  /^claude:(?<owner>[^/]+)\/(?<repo>[^#]+)#(?<issue>\d+)$/;

interface CheckRun {
  conclusion: string | null;
  output?: { summary?: string };
  status: string;
}

const parseCiCheckRuns = (
  checkRuns: CheckRun[]
): {
  ciStatus: "pending" | "running" | "passed" | "failed";
  ciFailureLog?: string;
} => {
  if (checkRuns.length === 0) {
    return { ciStatus: "pending" };
  }

  const hasRunning = checkRuns.some((run) => run.status !== "completed");
  if (hasRunning) {
    return { ciStatus: "running" };
  }

  const hasFailed = checkRuns.some((run) => run.conclusion === "failure");
  if (!hasFailed) {
    return { ciStatus: "passed" };
  }

  const failedRun = checkRuns.find((run) => run.conclusion === "failure");
  return {
    ciStatus: "failed",
    ciFailureLog: failedRun?.output?.summary?.slice(0, 2000),
  };
};

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
  agent: string,
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

      // Step 1: Create an issue with @claude mention to trigger the action
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
          `Failed to create issue: ${issueResponse.status} ${await issueResponse.text()}`
        );
      }

      const issueData = (await issueResponse.json()) as {
        number: number;
        html_url: string;
      };
      logs.push(
        log(
          "dev",
          "success",
          `Issue #${issueData.number} created`,
          issueData.html_url
        )
      );

      // Step 2: Try to trigger the claude-code workflow dispatch
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
        // The @claude mention in the issue body should trigger it if
        // the action is configured with issue event triggers
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

    // Parse externalRef: "claude:owner/repo#issueNumber"
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

    // Check for comments from Claude on the issue (progress indicator)
    const commentsResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues/${issue}/comments?per_page=5&sort=created&direction=desc`,
      { headers: buildHeaders(githubToken) }
    );

    if (commentsResponse.ok) {
      const comments = (await commentsResponse.json()) as Array<{
        user: { login: string };
        body: string;
        created_at: string;
      }>;

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

    // Check for PRs linked to this issue
    const prResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=open&sort=created&direction=desc&per_page=10`,
      { headers: buildHeaders(githubToken) }
    );

    if (!prResponse.ok) {
      return {
        status: "running",
        activityLogs:
          logs.length > 0
            ? logs
            : [log("dev", "info", "Claude Code is working...")],
        tokensUsed: 0,
        estimatedCostUsd: 0,
      };
    }

    const pulls = (await prResponse.json()) as Array<{
      number: number;
      html_url: string;
      body: string;
      head: { ref: string };
      draft: boolean;
    }>;

    const linkedPR = pulls.find(
      (pr) =>
        pr.body?.includes(`#${issue}`) || pr.body?.includes(`issues/${issue}`)
    );

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

    // Check CI
    const ciResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/commits/${linkedPR.head.ref}/check-runs`,
      { headers: buildHeaders(githubToken) }
    );

    const { ciStatus, ciFailureLog } = ciResponse.ok
      ? parseCiCheckRuns(
          ((await ciResponse.json()) as { check_runs: CheckRun[] }).check_runs
        )
      : { ciStatus: "pending" as const, ciFailureLog: undefined };

    return {
      status: ciStatus === "passed" ? "completed" : "running",
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
      // Validate GitHub token
      const ghResponse = await fetch(`${GITHUB_API}/user`, {
        headers: buildHeaders(credentials.githubToken),
      });
      if (!ghResponse.ok) {
        return false;
      }

      // Validate Anthropic key
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
      // A 200 or 400 (bad request but authenticated) means the key works
      return anthropicResponse.status !== 401;
    } catch {
      return false;
    }
  },
};
