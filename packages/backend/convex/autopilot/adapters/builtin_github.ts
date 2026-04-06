/**
 * GitHub API helpers used by the built-in coding adapter.
 *
 * Provides low-level operations for:
 *   - Reading files and directories from GitHub
 *   - Searching code in a repository
 *   - Creating branches and pull requests
 *   - Checking CI status
 */

const GITHUB_API = "https://api.github.com";

const GITHUB_REPO_URL_REGEX = /github\.com[/:](?<owner>[^/]+)\/(?<repo>[^/.]+)/;

export const BUILTIN_REF_REGEX =
  /^builtin:(?<owner>[^/]+)\/(?<repo>[^#]+)#(?<pr>\d+)$/;

export const buildHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

/**
 * Parse owner/repo from a GitHub clone URL.
 */
export const parseRepoUrl = (
  repoUrl: string
): { owner: string; repo: string } => {
  const match = repoUrl.match(GITHUB_REPO_URL_REGEX);
  if (!match?.groups) {
    throw new Error(`Invalid GitHub repo URL: ${repoUrl}`);
  }
  return { owner: match.groups.owner, repo: match.groups.repo };
};

/**
 * Read a file from GitHub via Contents API.
 */
export const readFileFromGitHub = async (
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
export const listDirectoryFromGitHub = async (
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
export const searchCodeInRepo = async (
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
export const createBranch = async (
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
export const createPullRequest = async (
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
export const getCIStatus = async (
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
