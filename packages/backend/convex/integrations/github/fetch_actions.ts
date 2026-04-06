import { v } from "convex/values";
import { action } from "../../_generated/server";

// GitHub API base URL
const GITHUB_API_URL = "https://api.github.com";

// Regex for parsing Link header
const LINK_HEADER_REGEX = /<([^>]+)>;\s*rel="([^"]+)"/;

/**
 * Parse GitHub Link header for pagination
 */
function parseLinkHeader(linkHeader: string | null): {
  next?: string;
  last?: string;
} {
  if (!linkHeader) {
    return {};
  }

  const links: Record<string, string> = {};
  const parts = linkHeader.split(",");

  for (const part of parts) {
    const match = part.match(LINK_HEADER_REGEX);
    if (match) {
      const [, url, rel] = match;
      if (url && rel) {
        links[rel] = url;
      }
    }
  }

  return links;
}

/**
 * Fetch repositories from GitHub installation with pagination support
 * Fetches ALL repositories by following pagination links
 */
export const fetchRepositories = action({
  args: {
    installationToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const allRepositories: Array<{
      id: number;
      full_name: string;
      name: string;
      default_branch: string;
      private: boolean;
      description: string | null;
    }> = [];

    let nextUrl: string | undefined =
      `${GITHUB_API_URL}/installation/repositories?per_page=100`;
    let pageCount = 0;

    // Fetch all pages
    while (nextUrl) {
      pageCount++;
      console.log(`Fetching repositories page ${pageCount}: ${nextUrl}`);

      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        total_count?: number;
        repositories: Array<{
          id: number;
          full_name: string;
          name: string;
          default_branch: string;
          private: boolean;
          description: string | null;
        }>;
      };

      console.log(
        `Page ${pageCount}: Received ${data.repositories.length} repositories. Total count: ${data.total_count ?? "unknown"}`
      );
      allRepositories.push(...data.repositories);

      // Check for next page in Link header
      const linkHeader = response.headers.get("Link");
      console.log(`Link header: ${linkHeader}`);
      const links = parseLinkHeader(linkHeader);
      nextUrl = links.next;

      if (nextUrl) {
        console.log(`Next page URL: ${nextUrl}`);
      } else {
        console.log("No more pages to fetch");
      }
    }

    console.log(
      `Finished fetching repositories. Total: ${allRepositories.length} repositories across ${pageCount} page(s)`
    );

    return allRepositories.map((repo) => ({
      id: String(repo.id),
      fullName: repo.full_name,
      name: repo.name,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      description: repo.description,
    }));
  },
});

/**
 * Fetch releases from a GitHub repository
 */
export const fetchReleases = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/releases`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.statusText}`);
    }

    const releases = (await response.json()) as Array<{
      id: number;
      tag_name: string;
      name: string | null;
      body: string | null;
      html_url: string;
      draft: boolean;
      prerelease: boolean;
      published_at: string | null;
      created_at: string;
    }>;

    return releases.map((release) => ({
      githubReleaseId: String(release.id),
      tagName: release.tag_name,
      name: release.name ?? undefined,
      body: release.body ?? undefined,
      htmlUrl: release.html_url,
      isDraft: release.draft,
      isPrerelease: release.prerelease,
      publishedAt: release.published_at
        ? new Date(release.published_at).getTime()
        : undefined,
      createdAt: new Date(release.created_at).getTime(),
    }));
  },
});

/**
 * Fetch issues from a GitHub repository
 */
export const fetchIssues = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    state: v.optional(
      v.union(v.literal("open"), v.literal("closed"), v.literal("all"))
    ),
    labels: v.optional(v.string()), // Comma-separated list of labels
    perPage: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const params = new URLSearchParams();
    params.set("state", args.state ?? "open");
    params.set("per_page", String(args.perPage ?? 100));
    if (args.labels) {
      params.set("labels", args.labels);
    }

    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/issues?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.statusText}`);
    }

    const issues = (await response.json()) as Array<{
      id: number;
      number: number;
      title: string;
      body: string | null;
      html_url: string;
      state: "open" | "closed";
      labels: Array<{ name: string; color: string }>;
      user: { login: string; avatar_url: string } | null;
      milestone: { title: string } | null;
      assignees: Array<{ login: string }>;
      created_at: string;
      updated_at: string;
      closed_at: string | null;
      pull_request?: unknown; // Filter out pull requests
    }>;

    // Filter out pull requests (they have a pull_request key)
    const actualIssues = issues.filter((issue) => !issue.pull_request);

    return actualIssues.map((issue) => ({
      githubIssueId: String(issue.id),
      githubIssueNumber: issue.number,
      title: issue.title,
      body: issue.body ?? undefined,
      htmlUrl: issue.html_url,
      state: issue.state,
      githubLabels: issue.labels.map((l) => l.name),
      githubAuthor: issue.user?.login,
      githubAuthorAvatarUrl: issue.user?.avatar_url,
      githubMilestone: issue.milestone?.title,
      githubAssignees: issue.assignees.map((a) => a.login),
      githubCreatedAt: new Date(issue.created_at).getTime(),
      githubUpdatedAt: new Date(issue.updated_at).getTime(),
      githubClosedAt: issue.closed_at
        ? new Date(issue.closed_at).getTime()
        : undefined,
    }));
  },
});

/**
 * Fetch labels from a GitHub repository
 */
export const fetchLabels = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/labels?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch labels: ${response.statusText}`);
    }

    const labels = (await response.json()) as Array<{
      id: number;
      name: string;
      color: string;
      description: string | null;
    }>;

    return labels.map((label) => ({
      id: String(label.id),
      name: label.name,
      color: label.color,
      description: label.description,
    }));
  },
});
