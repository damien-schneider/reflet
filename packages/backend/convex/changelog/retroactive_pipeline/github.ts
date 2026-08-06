export const GITHUB_API_URL = "https://api.github.com";

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

export const MAX_COMMITS_PER_GROUP = 100;
export const MAX_GROUPS = 50;
export const TAG_PAIRS_PER_BATCH = 10;

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

const QUERY_STRING_REGEX = /\?.*/;

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function formatCommit(commit: GitHubCommit): CommitData {
  const firstLine = commit.commit.message.split("\n")[0] ?? "";
  return {
    author: commit.author?.login ?? commit.commit.author.name,
    date: commit.commit.author.date,
    fullMessage: commit.commit.message,
    message: firstLine,
    sha: commit.sha,
  };
}

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    ...GITHUB_HEADERS,
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchGitHub<T>(
  url: string,
  token: string
): Promise<{ data: T; linkHeader: string | null }> {
  const response = await fetch(url, { headers: buildAuthHeaders(token) });

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
