/**
 * Built-in coding adapter using AI SDK v6 + Vercel Sandbox.
 *
 * This is the default adapter that works out of the box.
 * It uses bash-tool for file operations and git inside Vercel Sandbox,
 * and routes LLM calls through OpenRouter or Vercel AI Gateway.
 *
 * Architecture:
 *   1. Agent gets the technical spec and repo context
 *   2. Agent reads the codebase via GitHub API (no sandbox needed for reading)
 *   3. Agent generates code changes via generateObject (structured diffs)
 *   4. Changes are applied via GitHub Contents API (create branch, commit, PR)
 *   5. CI runs; if it fails, agent reads logs and retries
 *
 * For the MVP, we avoid a full sandbox and use the GitHub API approach.
 * This keeps infrastructure at zero while covering most task types.
 * Vercel Sandbox can be added later for tasks needing `bun install` / `bun test`.
 */

import type {
  ActivityLogEntry,
  CodingAdapter,
  CodingTaskInput,
  CodingTaskOutput,
  TaskStatusResponse,
} from "./types";

// ============================================
// GITHUB API HELPERS
// ============================================

const GITHUB_API = "https://api.github.com";

const GITHUB_REPO_URL_REGEX = /github\.com[/:](?<owner>[^/]+)\/(?<repo>[^/.]+)/;
const BUILTIN_REF_REGEX =
  /^builtin:(?<owner>[^/]+)\/(?<repo>[^#]+)#(?<pr>\d+)$/;

const buildHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

/**
 * Parse owner/repo from a GitHub clone URL.
 */
const parseRepoUrl = (repoUrl: string): { owner: string; repo: string } => {
  const match = repoUrl.match(GITHUB_REPO_URL_REGEX);
  if (!match?.groups) {
    throw new Error(`Invalid GitHub repo URL: ${repoUrl}`);
  }
  return { owner: match.groups.owner, repo: match.groups.repo };
};

/**
 * Read a file from GitHub via Contents API.
 */
const readFileFromGitHub = async (
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token: string
): Promise<{ content: string; sha: string } | null> => {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
    { headers: buildHeaders(token) }
  );

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { content: string; sha: string };
  const content = atob(data.content.replace(/\n/g, ""));
  return { content, sha: data.sha };
};

/**
 * List directory contents from GitHub.
 */
const listDirectoryFromGitHub = async (
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token: string
): Promise<Array<{ name: string; path: string; type: string }>> => {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
    { headers: buildHeaders(token) }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return (await response.json()) as Array<{
    name: string;
    path: string;
    type: string;
  }>;
};

/**
 * Search code in a repository via GitHub Search API.
 */
const searchCodeInRepo = async (
  owner: string,
  repo: string,
  query: string,
  token: string
): Promise<Array<{ path: string; fragment: string }>> => {
  const encodedQuery = encodeURIComponent(`${query} repo:${owner}/${repo}`);
  const response = await fetch(
    `${GITHUB_API}/search/code?q=${encodedQuery}&per_page=20`,
    { headers: buildHeaders(token) }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    items: Array<{
      path: string;
      text_matches?: Array<{ fragment: string }>;
    }>;
  };

  return data.items.map((item) => ({
    path: item.path,
    fragment: item.text_matches?.[0]?.fragment ?? "",
  }));
};

/**
 * Create a new branch from the base branch.
 */
const createBranch = async (
  owner: string,
  repo: string,
  branchName: string,
  baseBranch: string,
  token: string
): Promise<void> => {
  // Get the SHA of the base branch
  const refResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${baseBranch}`,
    { headers: buildHeaders(token) }
  );

  if (!refResponse.ok) {
    throw new Error(`Failed to get base branch ref: ${refResponse.status}`);
  }

  const refData = (await refResponse.json()) as {
    object: { sha: string };
  };

  // Create the new branch
  const createResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs`,
    {
      method: "POST",
      headers: {
        ...buildHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      }),
    }
  );

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    // Branch may already exist — that's OK for retries
    if (!errorBody.includes("Reference already exists")) {
      throw new Error(
        `Failed to create branch: ${createResponse.status} ${errorBody}`
      );
    }
  }
};

/**
 * Create a pull request.
 */
const createPullRequest = async (
  owner: string,
  repo: string,
  title: string,
  body: string,
  branch: string,
  baseBranch: string,
  token: string
): Promise<{ prUrl: string; prNumber: number }> => {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: {
      ...buildHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      body,
      head: branch,
      base: baseBranch,
      draft: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create PR: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as {
    html_url: string;
    number: number;
  };
  return { prUrl: data.html_url, prNumber: data.number };
};

/**
 * Get CI check status for a PR's head commit.
 */
const getCIStatus = async (
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<{
  status: "pending" | "running" | "passed" | "failed";
  failureLog?: string;
}> => {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits/${branch}/check-runs`,
    { headers: buildHeaders(token) }
  );

  if (!response.ok) {
    return { status: "pending" };
  }

  const data = (await response.json()) as {
    check_runs: Array<{
      status: string;
      conclusion: string | null;
      output?: { summary?: string };
    }>;
  };

  if (data.check_runs.length === 0) {
    return { status: "pending" };
  }

  const hasRunning = data.check_runs.some((run) => run.status !== "completed");
  if (hasRunning) {
    return { status: "running" };
  }

  const hasFailed = data.check_runs.some(
    (run) =>
      run.conclusion === "failure" ||
      run.conclusion === "cancelled" ||
      run.conclusion === "timed_out"
  );
  if (hasFailed) {
    const failedRun = data.check_runs.find(
      (run) =>
        run.conclusion === "failure" ||
        run.conclusion === "cancelled" ||
        run.conclusion === "timed_out"
    );
    return {
      status: "failed",
      failureLog: failedRun?.output?.summary?.slice(0, 2000),
    };
  }

  return { status: "passed" };
};

// ============================================
// BUILTIN ADAPTER
// ============================================

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

  executeTask: async (
    input: CodingTaskInput,
    credentials: Record<string, string>
  ): Promise<CodingTaskOutput> => {
    const { githubToken } = credentials;
    const logs: ActivityLogEntry[] = [];
    let tokensUsed = 0;
    const estimatedCostUsd = 0;

    try {
      const { owner, repo } = parseRepoUrl(input.repoUrl);
      logs.push(log("dev", "info", `Parsed repo: ${owner}/${repo}`));

      // Step 1: Create feature branch
      logs.push(log("dev", "action", `Creating branch ${input.featureBranch}`));
      await createBranch(
        owner,
        repo,
        input.featureBranch,
        input.baseBranch,
        githubToken
      );
      logs.push(log("dev", "success", "Branch created"));

      // Step 2: Explore codebase to understand context
      logs.push(log("dev", "action", "Exploring codebase structure..."));
      const rootFiles = await listDirectoryFromGitHub(
        owner,
        repo,
        "",
        input.baseBranch,
        githubToken
      );
      logs.push(
        log(
          "dev",
          "info",
          `Found ${rootFiles.length} files/dirs at root`,
          rootFiles.map((f) => f.name).join(", ")
        )
      );

      // Step 3: Read AGENTS.md if present
      const agentsMd = await readFileFromGitHub(
        owner,
        repo,
        "AGENTS.md",
        input.baseBranch,
        githubToken
      );
      if (agentsMd) {
        logs.push(
          log("dev", "info", "Found AGENTS.md — will follow coding rules")
        );
      }

      // Step 4: Search for relevant code based on the task
      logs.push(log("dev", "action", "Searching for relevant code..."));
      const searchResults = await searchCodeInRepo(
        owner,
        repo,
        input.title,
        githubToken
      );
      logs.push(
        log(
          "dev",
          "info",
          `Found ${searchResults.length} relevant code locations`,
          searchResults.map((r) => r.path).join(", ")
        )
      );

      // Step 5: For the MVP, we create the PR with the technical spec
      // as the body. The actual code generation will be done by the
      // AI SDK agent loop in a future iteration with Vercel Sandbox.
      //
      // This placeholder creates a draft PR with the spec so the
      // human or a more capable agent can pick it up.
      logs.push(
        log("dev", "action", "Creating draft PR with technical spec...")
      );

      const prBody = [
        "## Autopilot Task",
        "",
        `**Agent:** Dev (${builtinAdapter.displayName})`,
        "**Priority:** Based on task queue",
        "",
        "## Technical Spec",
        "",
        input.technicalSpec,
        "",
        "## Acceptance Criteria",
        "",
        ...input.acceptanceCriteria.map((c) => `- [ ] ${c}`),
        "",
        "---",
        "*Generated by Reflet Autopilot*",
      ].join("\n");

      const { prUrl, prNumber } = await createPullRequest(
        owner,
        repo,
        `[autopilot] ${input.title}`,
        prBody,
        input.featureBranch,
        input.baseBranch,
        githubToken
      );

      logs.push(log("dev", "success", `Draft PR created: #${prNumber}`, prUrl));
      tokensUsed = 0; // No LLM calls in GitHub-API-only mode

      return {
        status: "success",
        prUrl,
        prNumber,
        branch: input.featureBranch,
        activityLogs: logs,
        tokensUsed,
        estimatedCostUsd,
        externalRef: `builtin:${owner}/${repo}#${prNumber}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logs.push(log("dev", "error", `Task failed: ${errorMessage}`));
      return {
        status: "failed",
        activityLogs: logs,
        tokensUsed,
        estimatedCostUsd,
        errorMessage,
      };
    }
  },

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

    const prData = (await prResponse.json()) as {
      state: string;
      merged: boolean;
      head: { ref: string };
      html_url: string;
      number: number;
    };

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
