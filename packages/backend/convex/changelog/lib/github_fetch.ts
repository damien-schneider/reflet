import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { groupCommitsByWeek } from "./commit_grouping";

// GitHub API constants
const GITHUB_API_URL = "https://api.github.com";
const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;
export const MAX_COMMITS_PER_GROUP = 100;
const TAG_PAIRS_PER_BATCH = 10;

const VERSION_TAG_REGEX = /^v?\d/;
const QUERY_STRING_REGEX = /\?.*/;

// ============================================
// TYPES
// ============================================

export interface GitHubTag {
  commit: { sha: string };
  name: string;
}

export interface GitHubCommit {
  author?: { login: string } | null;
  commit: {
    author: { date: string; name: string };
    message: string;
  };
  sha: string;
}

export interface GitHubCompareResponse {
  commits: GitHubCommit[];
}

export interface CommitData {
  author: string;
  date: string;
  fullMessage: string;
  message: string;
  sha: string;
}

// ============================================
// HELPERS
// ============================================

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function formatCommit(commit: GitHubCommit): CommitData {
  const firstLine = commit.commit.message.split("\n")[0] ?? "";
  return {
    sha: commit.sha,
    message: firstLine,
    fullMessage: commit.commit.message,
    author: commit.author?.login ?? commit.commit.author.name,
    date: commit.commit.author.date,
  };
}

export function isTagVersion(groupId: string): boolean {
  return VERSION_TAG_REGEX.test(groupId);
}

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    ...GITHUB_HEADERS,
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Fetch from GitHub API with error handling and response body extraction.
 * Returns the parsed JSON on success, throws a descriptive error on failure.
 */
export async function fetchGitHub<T>(
  url: string,
  token: string
): Promise<{ data: T; linkHeader: string | null }> {
  const response = await fetch(url, { headers: buildAuthHeaders(token) });

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch (error) {
      console.warn("Failed to read GitHub API error response body:", error);
    }
    throw new Error(
      `GitHub API ${response.status} ${response.statusText} for ${url.replace(QUERY_STRING_REGEX, "")}: ${errorBody.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as T;
  const linkHeader = response.headers.get("Link");
  return { data, linkHeader };
}

export async function fetchAllTags(
  token: string,
  repoFullName: string
): Promise<Array<{ name: string; sha: string }>> {
  const allTags: Array<{ name: string; sha: string }> = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${GITHUB_API_URL}/repos/${repoFullName}/tags?per_page=100&page=${page}`;
    const { data: tags, linkHeader } = await fetchGitHub<GitHubTag[]>(
      url,
      token
    );

    for (const tag of tags) {
      allTags.push({ name: tag.name, sha: tag.commit.sha });
    }

    hasMore = linkHeader?.includes('rel="next"') ?? false;
    page++;
  }

  console.log(
    `[retroactive] Fetched ${allTags.length} tags from ${repoFullName}`
  );
  return allTags;
}

/**
 * Verify the installation token has access to the repo and resolve the effective branch.
 * Returns the effective branch name (may differ from targetBranch if repo default changed).
 */
export async function verifyRepoAccess(
  token: string,
  repoFullName: string,
  targetBranch: string
): Promise<string> {
  const repoCheckUrl = `${GITHUB_API_URL}/repos/${repoFullName}`;
  try {
    const { data: repoInfo } = await fetchGitHub<{
      default_branch: string;
      full_name: string;
      permissions?: Record<string, boolean>;
      private: boolean;
    }>(repoCheckUrl, token);
    console.log(
      `[retroactive] Token access verified: repo=${repoInfo.full_name}, private=${repoInfo.private}, defaultBranch=${repoInfo.default_branch}, permissions=${JSON.stringify(repoInfo.permissions)}`
    );

    const effectiveBranch =
      repoInfo.default_branch && repoInfo.default_branch !== targetBranch
        ? repoInfo.default_branch
        : targetBranch;

    if (effectiveBranch !== targetBranch) {
      console.warn(
        `[retroactive] Branch mismatch: job has "${targetBranch}" but repo default is "${effectiveBranch}". Using repo default.`
      );
    }

    return effectiveBranch;
  } catch (repoError) {
    console.error(
      `[retroactive] Token cannot access repo ${repoFullName}: ${getErrorMessage(repoError)}`
    );
    throw new Error(
      `GitHub App cannot access ${repoFullName}. Check that the repository is included in the App's repository access settings. Error: ${getErrorMessage(repoError)}`
    );
  }
}

/**
 * Fetch commits by comparing consecutive tag pairs.
 * Returns the total number of commits fetched (including previously fetched).
 */
export async function fetchCommitsByTags(
  ctx: ActionCtx,
  args: { jobId: Id<"retroactiveJobs">; cursor?: number },
  tags: Array<{ name: string; sha: string }>,
  token: string,
  repoFullName: string,
  previouslyFetched: number
): Promise<number> {
  const startIndex = args.cursor ?? 0;
  const endIndex = Math.min(startIndex + TAG_PAIRS_PER_BATCH, tags.length - 1);
  let totalFetched = previouslyFetched;
  let skippedPairs = 0;

  for (let i = startIndex; i < endIndex; i++) {
    const base = tags[i + 1];
    const head = tags[i];
    if (!(base && head)) {
      continue;
    }

    const url = `${GITHUB_API_URL}/repos/${repoFullName}/compare/${base.sha}...${head.sha}`;

    try {
      const { data } = await fetchGitHub<GitHubCompareResponse>(url, token);
      const commits = data.commits
        .slice(0, MAX_COMMITS_PER_GROUP)
        .map(formatCommit);

      if (commits.length > 0) {
        await ctx.runMutation(
          internal.changelog.retroactive_mutations.saveCommitBatch,
          { jobId: args.jobId, groupId: head.name, commits }
        );
        totalFetched += commits.length;
      }
    } catch (error) {
      console.warn(
        `[retroactive] Failed to compare ${base.name}...${head.name}: ${getErrorMessage(error)}`
      );
      skippedPairs++;
    }
  }

  if (skippedPairs > 0) {
    console.warn(
      `[retroactive] Skipped ${skippedPairs} of ${endIndex - startIndex} tag pairs due to errors`
    );
  }

  await ctx.runMutation(
    internal.changelog.retroactive_mutations.updateJobProgress,
    {
      jobId: args.jobId,
      fetchedCommits: totalFetched,
      currentStep: `Fetched commits for ${endIndex} of ${tags.length - 1} tag pairs (${totalFetched} commits)`,
    }
  );

  const hasMorePairs = endIndex < tags.length - 1;
  if (hasMorePairs) {
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.fetchCommitsPhase,
      { jobId: args.jobId, cursor: endIndex }
    );
  } else if (totalFetched > 0) {
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.groupCommitsPhase,
      { jobId: args.jobId }
    );
  }

  return totalFetched;
}

/**
 * Fetch commits by time (paginated), grouping by ISO week.
 */
export async function fetchCommitsByTime(
  ctx: ActionCtx,
  args: { jobId: Id<"retroactiveJobs">; cursor?: number },
  token: string,
  repoFullName: string,
  branch: string,
  previouslyFetched: number
): Promise<void> {
  let totalFetched = previouslyFetched;
  const page = (args.cursor ?? 0) + 1;

  const url = `${GITHUB_API_URL}/repos/${repoFullName}/commits?per_page=100&sha=${encodeURIComponent(branch)}&page=${page}`;
  console.log(`[retroactive] Fetching commits: ${url}`);

  const { data: rawCommits, linkHeader } = await fetchGitHub<GitHubCommit[]>(
    url,
    token
  );

  if (!Array.isArray(rawCommits)) {
    console.error(
      `[retroactive] Unexpected response type: ${typeof rawCommits}, value: ${JSON.stringify(rawCommits).slice(0, 200)}`
    );
    throw new Error(
      `GitHub commits API returned unexpected response type: ${typeof rawCommits}`
    );
  }

  console.log(
    `[retroactive] Fetched page ${page}: ${rawCommits.length} commits from ${repoFullName} (branch: ${branch})`
  );

  if (rawCommits.length === 0 && page === 1) {
    console.warn(
      `[retroactive] GitHub returned 0 commits for ${repoFullName} branch=${branch}. This may indicate a permissions issue with the GitHub App installation token.`
    );
  }

  const formatted = rawCommits.map(formatCommit);
  const weekGroups = groupCommitsByWeek(formatted);

  for (const [weekKey, commits] of weekGroups) {
    if (commits.length > 0) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.saveCommitBatch,
        {
          jobId: args.jobId,
          groupId: weekKey,
          commits: commits.slice(0, MAX_COMMITS_PER_GROUP),
        }
      );
      totalFetched += commits.length;
    }
  }

  await ctx.runMutation(
    internal.changelog.retroactive_mutations.updateJobProgress,
    {
      jobId: args.jobId,
      fetchedCommits: totalFetched,
      currentStep: `Fetched ${totalFetched} commits (page ${page})`,
    }
  );

  const hasNextPage =
    (linkHeader?.includes('rel="next"') ?? false) && rawCommits.length > 0;

  const nextAction = hasNextPage
    ? internal.changelog.retroactive_actions.fetchCommitsPhase
    : internal.changelog.retroactive_actions.groupCommitsPhase;
  const nextArgs = hasNextPage
    ? { jobId: args.jobId, cursor: page }
    : { jobId: args.jobId };

  await ctx.scheduler.runAfter(0, nextAction, nextArgs);
}
