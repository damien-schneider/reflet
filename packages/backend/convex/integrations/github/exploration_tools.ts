/**
 * GitHub API tools for agentic product exploration.
 *
 * Factory function that creates AI SDK tool definitions for exploring
 * a GitHub repository with an authenticated installation token.
 */

import { tool } from "ai";
import { z } from "zod";

const GITHUB_API_URL = "https://api.github.com";
const MAX_FILE_CONTENT_LENGTH = 4000;
const MAX_SEARCH_RESULTS = 10;
const RATE_LIMIT_RETRY_MS = 10_000;

const githubHeaders = (token: string) =>
  ({
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3.text-match+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }) as const;

async function fetchWithRateLimit(
  url: string,
  options: RequestInit
): Promise<Response> {
  const response = await fetch(url, options);

  if (response.status === 403 || response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    const waitMs = retryAfter ? Number(retryAfter) * 1000 : RATE_LIMIT_RETRY_MS;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return fetch(url, options);
  }

  return response;
}

const listDirectorySchema = z.object({
  path: z.string().describe("Directory path to list, e.g. 'src/app'"),
});

const readFileSchema = z.object({
  path: z.string().describe("File path, e.g. 'src/app/page.tsx'"),
});

const searchCodeSchema = z.object({
  query: z
    .string()
    .describe("Search query, e.g. 'user authentication' or 'pricing'"),
});

const listRecentIssuesSchema = z.object({
  labels: z
    .string()
    .optional()
    .describe("Comma-separated label filter, e.g. 'bug,enhancement'"),
  limit: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .describe("Number of issues, max 30"),
});

const listRecentPullRequestsSchema = z.object({
  limit: z.number().min(1).max(30).optional().describe("Number of PRs, max 30"),
});

export const createExplorationTools = (token: string, repo: string) => ({
  listDirectory: tool({
    description:
      "List files and folders at a path in the repository. Use '.' or '' for the root.",
    inputSchema: listDirectorySchema,
    execute: async ({ path }: z.infer<typeof listDirectorySchema>) => {
      const normalizedPath = path === "." ? "" : path;
      const url = `${GITHUB_API_URL}/repos/${repo}/contents/${normalizedPath}`;
      const response = await fetchWithRateLimit(url, {
        headers: githubHeaders(token),
      });

      if (!response.ok) {
        return `Failed to list directory '${path}': ${response.status}`;
      }

      const data = (await response.json()) as Array<{
        name: string;
        type: string;
        path: string;
      }>;

      if (!Array.isArray(data)) {
        return `'${path}' is a file, not a directory`;
      }

      return data
        .map(
          (item) => `${item.type === "dir" ? "[dir]" : "[file]"} ${item.name}`
        )
        .join("\n");
    },
  }),

  readFile: tool({
    description:
      "Read the content of a file in the repository. Truncated at 15,000 chars.",
    inputSchema: readFileSchema,
    execute: async ({ path }: z.infer<typeof readFileSchema>) => {
      const url = `${GITHUB_API_URL}/repos/${repo}/contents/${path}`;
      const response = await fetchWithRateLimit(url, {
        headers: githubHeaders(token),
      });

      if (!response.ok) {
        return `Failed to read '${path}': ${response.status}`;
      }

      const data = (await response.json()) as {
        content?: string;
        encoding?: string;
        message?: string;
      };

      if (data.message) {
        return `Error: ${data.message}`;
      }

      if (!data.content || data.encoding !== "base64") {
        return `Cannot read '${path}': unsupported encoding or binary file`;
      }

      const decoded = atob(data.content.replace(/\n/g, ""));
      const truncated = decoded.slice(0, MAX_FILE_CONTENT_LENGTH);
      const wasTruncated = decoded.length > MAX_FILE_CONTENT_LENGTH;

      return wasTruncated
        ? `${truncated}\n\n[truncated — ${decoded.length - MAX_FILE_CONTENT_LENGTH} chars omitted]`
        : truncated;
    },
  }),

  searchCode: tool({
    description:
      "Search code in the repository. Returns file paths and matched fragments.",
    inputSchema: searchCodeSchema,
    execute: async ({ query }: z.infer<typeof searchCodeSchema>) => {
      const searchQuery = `${query} repo:${repo}`;
      const url = `${GITHUB_API_URL}/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${MAX_SEARCH_RESULTS}`;

      const response = await fetchWithRateLimit(url, {
        headers: githubHeaders(token),
      });

      if (!response.ok) {
        if (response.status === 422) {
          return "Search query too complex or repository not indexed";
        }
        return `Code search failed: ${response.status}`;
      }

      const data = (await response.json()) as {
        items?: Array<{
          path: string;
          text_matches?: Array<{ fragment: string }>;
        }>;
        total_count?: number;
      };

      const items = data.items ?? [];
      if (items.length === 0) {
        return "No results found";
      }

      return items
        .map((item) => {
          const fragments = (item.text_matches ?? [])
            .map((m) => `  > ${m.fragment.trim()}`)
            .join("\n");
          return fragments ? `${item.path}\n${fragments}` : item.path;
        })
        .join("\n\n");
    },
  }),

  getRepoMetadata: tool({
    description:
      "Get repository metadata: description, topics, homepage, language stats.",
    inputSchema: z.object({}),
    execute: async () => {
      const [repoResponse, langsResponse] = await Promise.all([
        fetchWithRateLimit(`${GITHUB_API_URL}/repos/${repo}`, {
          headers: githubHeaders(token),
        }),
        fetchWithRateLimit(`${GITHUB_API_URL}/repos/${repo}/languages`, {
          headers: githubHeaders(token),
        }),
      ]);

      if (!repoResponse.ok) {
        return `Failed to fetch repo metadata: ${repoResponse.status}`;
      }

      const repoData = (await repoResponse.json()) as {
        description?: string;
        topics?: string[];
        homepage?: string;
        default_branch?: string;
        stargazers_count?: number;
      };

      const languages = langsResponse.ok
        ? ((await langsResponse.json()) as Record<string, number>)
        : {};

      const lines = [
        repoData.description && `Description: ${repoData.description}`,
        repoData.homepage && `Homepage: ${repoData.homepage}`,
        repoData.topics?.length && `Topics: ${repoData.topics.join(", ")}`,
        repoData.default_branch && `Default branch: ${repoData.default_branch}`,
        repoData.stargazers_count !== undefined &&
          `Stars: ${repoData.stargazers_count}`,
        Object.keys(languages).length > 0 &&
          `Languages: ${Object.keys(languages).join(", ")}`,
      ].filter(Boolean);

      return lines.join("\n") || "No metadata available";
    },
  }),

  listRecentIssues: tool({
    description:
      "List recent issues to understand user pain points and product direction.",
    inputSchema: listRecentIssuesSchema,
    execute: async ({
      labels,
      limit,
    }: z.infer<typeof listRecentIssuesSchema>) => {
      const perPage = Math.min(limit ?? 20, 30);
      const labelParam = labels ? `&labels=${encodeURIComponent(labels)}` : "";
      const url = `${GITHUB_API_URL}/repos/${repo}/issues?state=all&per_page=${perPage}&sort=updated${labelParam}`;

      const response = await fetchWithRateLimit(url, {
        headers: githubHeaders(token),
      });

      if (!response.ok) {
        return `Failed to fetch issues: ${response.status}`;
      }

      const issues = (await response.json()) as Array<{
        title: string;
        state: string;
        labels: Array<{ name: string }>;
        pull_request?: unknown;
      }>;

      const filteredIssues = issues.filter((i) => !i.pull_request);
      if (filteredIssues.length === 0) {
        return "No issues found";
      }

      return filteredIssues
        .map((issue) => {
          const issueLabels = issue.labels.map((l) => l.name).join(", ");
          const labelStr = issueLabels ? ` [${issueLabels}]` : "";
          return `[${issue.state}]${labelStr} ${issue.title}`;
        })
        .join("\n");
    },
  }),

  listRecentPullRequests: tool({
    description:
      "List recent pull requests to understand recent feature development.",
    inputSchema: listRecentPullRequestsSchema,
    execute: async ({
      limit,
    }: z.infer<typeof listRecentPullRequestsSchema>) => {
      const perPage = Math.min(limit ?? 20, 30);
      const url = `${GITHUB_API_URL}/repos/${repo}/pulls?state=all&per_page=${perPage}&sort=updated`;

      const response = await fetchWithRateLimit(url, {
        headers: githubHeaders(token),
      });

      if (!response.ok) {
        return `Failed to fetch pull requests: ${response.status}`;
      }

      const prs = (await response.json()) as Array<{
        title: string;
        state: string;
        labels: Array<{ name: string }>;
      }>;

      if (prs.length === 0) {
        return "No pull requests found";
      }

      return prs
        .map((pr) => {
          const prLabels = pr.labels.map((l) => l.name).join(", ");
          const labelStr = prLabels ? ` [${prLabels}]` : "";
          return `[${pr.state}]${labelStr} ${pr.title}`;
        })
        .join("\n");
    },
  }),
});
