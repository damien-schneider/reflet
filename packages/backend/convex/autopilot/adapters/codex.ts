/**
 * OpenAI Codex adapter.
 *
 * Delegates coding tasks to OpenAI Codex via the GitHub Action integration.
 * Codex handles its own managed sandbox:
 *   - Isolated container with network access in setup phase
 *   - Automatic dependency detection and installation
 *   - Reads AGENTS.md for project conventions
 *   - Creates PRs and can auto-review them
 *
 * Integration approach:
 *   We trigger Codex through the GitHub Action (openai/codex-action@v1)
 *   by creating a GitHub Issue labeled `codex` and dispatching a workflow.
 *
 * Requirements:
 *   - OpenAI API key (for Codex cloud tasks)
 *   - GitHub PAT with actions:write, contents:write, issues:write
 *   - Codex GitHub Action installed in the repo
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
const CODEX_REF_REGEX = /^codex:(?<owner>[^/]+)\/(?<repo>[^#]+)#(?<issue>\d+)$/;

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

  const hasFailed = checkRuns.some(
    (run) =>
      run.conclusion === "failure" ||
      run.conclusion === "cancelled" ||
      run.conclusion === "timed_out"
  );
  if (!hasFailed) {
    return { ciStatus: "passed" };
  }

  const failedRun = checkRuns.find(
    (run) =>
      run.conclusion === "failure" ||
      run.conclusion === "cancelled" ||
      run.conclusion === "timed_out"
  );
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
      `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=open&sort=created&direction=desc&per_page=10`,
      { headers: buildHeaders(githubToken) }
    );

    if (!prResponse.ok) {
      return {
        status: "running",
        activityLogs: [log("system", "info", "Codex is working...")],
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
      // Check workflow run status
      const runsResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/actions/runs?per_page=5`,
        { headers: buildHeaders(githubToken) }
      );

      if (runsResponse.ok) {
        const runsData = (await runsResponse.json()) as {
          workflow_runs: Array<{
            name: string;
            status: string;
            conclusion: string | null;
          }>;
        };
        const codexRun = runsData.workflow_runs.find(
          (run) =>
            run.name.toLowerCase().includes("codex") &&
            run.status !== "completed"
        );
        if (codexRun) {
          logs.push(
            log("dev", "info", `Codex workflow running: ${codexRun.status}`)
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
    }

    logs.push(
      log(
        "dev",
        "success",
        `Codex opened PR #${linkedPR.number}`,
        linkedPR.html_url
      )
    );

    // Check CI status
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
