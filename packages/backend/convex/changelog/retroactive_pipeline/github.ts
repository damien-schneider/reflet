import { type GitTag, MAX_SOURCE_COMMITS, MAX_SOURCE_FILES } from "../source";
import type { ReleaseCommit, ReleaseFile } from "../tableFields";

export const GITHUB_API_URL = "https://api.github.com";

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

export const MAX_GROUPS = 50;
export const TAG_PAIRS_PER_BATCH = 10;

interface GitHubTag {
  commit: { sha: string };
  name: string;
}

export interface GitHubCommit {
  author?: { login: string } | null;
  commit: {
    author: { date: string; name: string };
    message: string;
  };
  parents: Array<{ sha: string }>;
  sha: string;
}

export interface GitHubCompareResponse {
  commits: GitHubCommit[];
  files?: Array<{
    additions: number;
    deletions: number;
    filename: string;
    status: string;
  }>;
  total_commits: number;
}

export interface CommitWindow {
  commits: ReleaseCommit[];
  files: ReleaseFile[];
  totalCommits: number;
}

const QUERY_STRING_REGEX = /\?.*/;

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function formatCommit(commit: GitHubCommit): ReleaseCommit {
  return {
    author: commit.author?.login ?? commit.commit.author.name,
    date: commit.commit.author.date,
    fullMessage: commit.commit.message,
    message: commit.commit.message.split("\n")[0] ?? "",
    sha: commit.sha,
  };
}

export function formatNonMergeCommitsNewestFirst(
  oldestFirst: GitHubCommit[]
): ReleaseCommit[] {
  return oldestFirst
    .filter((commit) => commit.parents.length <= 1)
    .reverse()
    .map(formatCommit);
}

export async function fetchGitHub<T>(
  url: string,
  token: string
): Promise<{ data: T; linkHeader: string | null }> {
  const response = await fetch(url, {
    headers: { ...GITHUB_HEADERS, Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch {
      // body unreadable — status alone still identifies the failure
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
): Promise<GitTag[]> {
  const allTags: GitTag[] = [];
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

  return allTags;
}

export async function fetchComparedCommits(
  token: string,
  repoFullName: string,
  baseRef: string,
  headSha: string
): Promise<CommitWindow> {
  const compareUrl = `${GITHUB_API_URL}/repos/${repoFullName}/compare/${encodeURIComponent(baseRef)}...${headSha}?per_page=${MAX_SOURCE_COMMITS}`;
  const { data: firstPage } = await fetchGitHub<GitHubCompareResponse>(
    `${compareUrl}&page=1`,
    token
  );
  const lastPage = Math.ceil(firstPage.total_commits / MAX_SOURCE_COMMITS);
  let oldestFirst = firstPage.commits;
  if (lastPage > 1) {
    const tailPages = await Promise.all(
      [lastPage - 1, lastPage].map(async (page) =>
        page === 1
          ? firstPage.commits
          : (
              await fetchGitHub<GitHubCompareResponse>(
                `${compareUrl}&page=${page}`,
                token
              )
            ).data.commits
      )
    );
    oldestFirst = tailPages.flat();
  }
  return {
    commits: formatNonMergeCommitsNewestFirst(
      oldestFirst.slice(-MAX_SOURCE_COMMITS)
    ),
    files: (firstPage.files ?? [])
      .slice(0, MAX_SOURCE_FILES)
      .map(({ additions, deletions, filename, status }) => ({
        additions,
        deletions,
        filename,
        status,
      })),
    totalCommits: firstPage.total_commits,
  };
}

export async function githubBranchExists(
  token: string,
  repoFullName: string,
  branch: string
): Promise<boolean> {
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${repoFullName}/branches/${encodeURIComponent(branch)}`,
    { headers: { ...GITHUB_HEADERS, Authorization: `Bearer ${token}` } }
  );
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status} ${response.statusText} while checking branch ${branch}`
    );
  }
  return true;
}
