/**
 * GitHub API helpers used by the built-in coding adapter.
 *
 * Provides low-level operations for:
 *   - Reading files and directories from GitHub
 *   - Searching code in a repository
 *   - Creating branches and pull requests
 *   - Checking CI status
 */

import {
  formatProviderHttpError,
  githubCheckRunsResponseSchema,
  githubCodeSearchResponseSchema,
  githubContentFileResponseSchema,
  githubDirectoryResponseSchema,
  githubIssueResponseSchema,
  githubRefResponseSchema,
  parseGitHubCheckRuns,
  parseResponseJson,
} from "./adapter_helpers";

const GITHUB_API = "https://api.github.com";

const GITHUB_REPO_URL_REGEX = /github\.com[/:](?<owner>[^/]+)\/(?<repo>[^/.]+)/;

export const BUILTIN_REF_REGEX =
  /^builtin:(?<owner>[^/]+)\/(?<repo>[^#]+)#(?<pr>\d+)$/;

export const buildHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
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

  const data = await parseResponseJson(
    response,
    githubContentFileResponseSchema,
    "GitHub content"
  );
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

  return parseResponseJson(
    response,
    githubDirectoryResponseSchema,
    "GitHub directory"
  );
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

  const data = await parseResponseJson(
    response,
    githubCodeSearchResponseSchema,
    "GitHub code search"
  );

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

  const refData = await parseResponseJson(
    refResponse,
    githubRefResponseSchema,
    "GitHub branch ref"
  );

  // Create the new branch
  const createResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs`,
    {
      method: "POST",
      headers: buildHeaders(token),
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
      throw new Error(formatProviderHttpError("Create branch", createResponse));
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
    headers: buildHeaders(token),
    body: JSON.stringify({
      title,
      body,
      head: branch,
      base: baseBranch,
      draft: true,
    }),
  });

  if (!response.ok) {
    throw new Error(formatProviderHttpError("Create pull request", response));
  }

  const data = await parseResponseJson(
    response,
    githubIssueResponseSchema,
    "GitHub pull request"
  );
  return { prUrl: data.html_url, prNumber: data.number };
};

/**
 * Get CI check status for a PR's head commit.
 */
export const getCIStatus = async (
  owner: string,
  repo: string,
  commitSha: string,
  token: string
): Promise<{
  status: "pending" | "running" | "passed" | "failed";
  failureLog?: string;
}> => {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits/${commitSha}/check-runs`,
    { headers: buildHeaders(token) }
  );

  if (!response.ok) {
    return { status: "pending" };
  }

  const data = await parseResponseJson(
    response,
    githubCheckRunsResponseSchema,
    "GitHub check runs"
  );

  const { ciFailureLog, ciStatus } = parseGitHubCheckRuns(data.check_runs);
  return { status: ciStatus, failureLog: ciFailureLog };
};
