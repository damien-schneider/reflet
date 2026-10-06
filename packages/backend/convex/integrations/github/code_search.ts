import { GITHUB_API_URL, githubApiHeaders } from "./github_constants";

const MAX_FILE_CONTENT_LENGTH = 10_000;
const MAX_SEARCH_RESULTS_PER_QUERY = 10;
const RATE_LIMIT_RETRY_MS = 10_000;

interface CodeSearchResult {
  filePath: string;
  matchedFragments: string[];
  repository: string;
}

interface FileContent {
  content: string;
  filePath: string;
  truncated: boolean;
}

/**
 * Search code in a GitHub repository using the Code Search API.
 * Handles rate limiting with retry-after.
 */
export async function searchCode(
  token: string,
  repo: string,
  query: string
): Promise<CodeSearchResult[]> {
  const searchQuery = `${query} repo:${repo}`;
  const url = `${GITHUB_API_URL}/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${MAX_SEARCH_RESULTS_PER_QUERY}`;

  const response = await fetchWithRateLimit(url, token);

  if (!response.ok) {
    if (response.status === 422) {
      // Unprocessable — query too complex or repo not indexed
      return [];
    }
    throw new Error(
      `GitHub Code Search failed (${response.status}): ${await response.text()}`
    );
  }

  const data = (await response.json()) as {
    items?: Array<{
      path: string;
      repository: { full_name: string };
      text_matches?: Array<{ fragment: string }>;
    }>;
  };

  return (data.items ?? []).map((item) => ({
    filePath: item.path,
    matchedFragments: (item.text_matches ?? []).map((m) => m.fragment),
    repository: item.repository.full_name,
  }));
}

/**
 * Fetch the content of a specific file from a GitHub repository.
 * Truncates to MAX_FILE_CONTENT_LENGTH characters.
 */
export async function fetchFileContent(
  token: string,
  repo: string,
  path: string
): Promise<FileContent | null> {
  const url = `${GITHUB_API_URL}/repos/${repo}/contents/${encodeURIComponent(path)}`;

  const response = await fetch(url, {
    headers: githubApiHeaders(token),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      `GitHub Contents API failed (${response.status}): ${await response.text()}`
    );
  }

  const data = (await response.json()) as { content?: string; size?: number };
  if (!data.content) {
    return null;
  }

  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  const truncated = decoded.length > MAX_FILE_CONTENT_LENGTH;
  const content = truncated
    ? `${decoded.slice(0, MAX_FILE_CONTENT_LENGTH)}\n...[truncated]`
    : decoded;

  return { content, filePath: path, truncated };
}

/**
 * Run multiple code search queries and deduplicate results by file path.
 * Returns unique results ordered by number of query matches (most relevant first).
 */
export async function searchCodeMultiQuery(
  token: string,
  repo: string,
  queries: string[]
): Promise<CodeSearchResult[]> {
  const allResults = new Map<
    string,
    CodeSearchResult & { matchCount: number }
  >();

  for (const query of queries) {
    const results = await searchCode(token, repo, query);
    for (const result of results) {
      const existing = allResults.get(result.filePath);
      if (existing) {
        existing.matchCount++;
        // Merge fragments without duplicates
        for (const fragment of result.matchedFragments) {
          if (!existing.matchedFragments.includes(fragment)) {
            existing.matchedFragments.push(fragment);
          }
        }
      } else {
        allResults.set(result.filePath, { ...result, matchCount: 1 });
      }
    }
  }

  // Sort by match count descending (files matching more queries are more relevant)
  return [...allResults.values()]
    .sort((a, b) => b.matchCount - a.matchCount)
    .map(({ matchCount: _, ...result }) => result);
}

/**
 * Fetch with retry-after handling for GitHub rate limits.
 */
async function fetchWithRateLimit(
  url: string,
  token: string
): Promise<Response> {
  const init = {
    headers: {
      ...githubApiHeaders(token),
      Accept: "application/vnd.github.text-match+json",
    },
  };
  const response = await fetch(url, init);

  if (response.status === 403) {
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
      const waitMs = Math.min(
        Number.parseInt(retryAfter, 10) * 1000,
        RATE_LIMIT_RETRY_MS
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return fetch(url, init);
    }
  }

  return response;
}
