import { v } from "convex/values";
import { action } from "./_generated/server";

const GITHUB_API_URL = "https://api.github.com";

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

/**
 * Fetch branches from a GitHub repository
 * Used by the setup wizard to let users pick a target branch
 */
export const fetchBranches = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/branches?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          ...GITHUB_HEADERS,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch branches: ${response.statusText}`);
    }

    const branches = (await response.json()) as Array<{
      name: string;
      protected: boolean;
    }>;

    return branches.map((branch) => ({
      name: branch.name,
      isProtected: branch.protected,
    }));
  },
});

/**
 * Fetch commits between two git references (tags, branches, or SHAs)
 * Used for generating release notes from code changes (Pro feature)
 *
 * Uses GitHub's Compare API: GET /repos/{owner}/{repo}/compare/{base}...{head}
 * - If previousTag is provided, compares from previous tag to current tag/branch
 * - If no previousTag, fetches the latest commits on the branch
 */
export const fetchCommitsBetweenRefs = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    base: v.string(),
    head: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/compare/${encodeURIComponent(args.base)}...${encodeURIComponent(args.head)}`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          ...GITHUB_HEADERS,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to compare refs: ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as {
      status: string;
      ahead_by: number;
      behind_by: number;
      total_commits: number;
      commits: Array<{
        sha: string;
        commit: {
          message: string;
          author: {
            name: string;
            date: string;
          };
        };
        author: {
          login: string;
          avatar_url: string;
        } | null;
      }>;
      files?: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        changes: number;
        patch?: string;
      }>;
    };

    return {
      status: data.status,
      aheadBy: data.ahead_by,
      totalCommits: data.total_commits,
      commits: data.commits.map((commit) => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split("\n")[0] ?? "",
        fullMessage: commit.commit.message,
        author: commit.author?.login ?? commit.commit.author.name,
        date: commit.commit.author.date,
      })),
      files: (data.files ?? []).map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
      })),
    };
  },
});

/**
 * Fetch tags from a GitHub repository (for version comparison)
 * Returns tags sorted by creation date (most recent first)
 */
export const fetchTags = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/tags?per_page=30`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          ...GITHUB_HEADERS,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tags: ${response.statusText}`);
    }

    const tags = (await response.json()) as Array<{
      name: string;
      commit: { sha: string };
    }>;

    return tags.map((tag) => ({
      name: tag.name,
      sha: tag.commit.sha.substring(0, 7),
    }));
  },
});

/**
 * Fetch recent commits on a branch (when no previous tag exists)
 */
export const fetchRecentCommits = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    branch: v.string(),
    perPage: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const count = args.perPage ?? 30;
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/commits?sha=${encodeURIComponent(args.branch)}&per_page=${count}`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          ...GITHUB_HEADERS,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch commits: ${response.statusText}`);
    }

    const commits = (await response.json()) as Array<{
      sha: string;
      commit: {
        message: string;
        author: {
          name: string;
          date: string;
        };
      };
      author: {
        login: string;
        avatar_url: string;
      } | null;
    }>;

    return commits.map((commit) => ({
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message.split("\n")[0] ?? "",
      fullMessage: commit.commit.message,
      author: commit.author?.login ?? commit.commit.author.name,
      date: commit.commit.author.date,
    }));
  },
});
