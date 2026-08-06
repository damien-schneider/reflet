import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { action, internalAction } from "../../_generated/server";
import { authComponent } from "../../auth/auth";
import { isOrgAdmin } from "../../shared/membership";
import { GITHUB_API_URL } from "./github_constants";

const LINK_HEADER_REGEX = /<([^>]+)>;\s*rel="([^"]+)"/;

/**
 * Save user-level GitHub App installation from OAuth callback.
 * The installation is bound to the authenticated caller — the callback state is
 * attacker-controlled, so the user is never taken from the request.
 */
export const saveInstallationFromCallback = action({
  args: {
    accountAvatarUrl: v.optional(v.string()),
    accountLogin: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    installationId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args): Promise<Id<"userGithubConnections">> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    if (args.organizationId) {
      const membership = await ctx.runQuery(
        internal.shared.access.membershipForUser,
        { organizationId: args.organizationId, userId: user._id }
      );
      if (!isOrgAdmin(membership?.role)) {
        throw new Error("Only admins can connect GitHub to an organization");
      }
    }

    const userConnectionId = await ctx.runMutation(
      internal.integrations.github.installation_mutations.saveUserInstallation,
      {
        accountAvatarUrl: args.accountAvatarUrl,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        installationId: args.installationId,
        userId: user._id,
      }
    );

    if (args.organizationId) {
      await ctx.runMutation(
        internal.integrations.github.installation_mutations.linkRepoToOrg,
        {
          linkedByUserId: user._id,
          organizationId: args.organizationId,
          userGithubConnectionId: userConnectionId,
        }
      );
    }

    return userConnectionId;
  },
});

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
export const fetchRepositories = internalAction({
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
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
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
      defaultBranch: repo.default_branch,
      description: repo.description,
      fullName: repo.full_name,
      id: String(repo.id),
      isPrivate: repo.private,
      name: repo.name,
    }));
  },
});

/**
 * Fetch releases from a GitHub repository
 */
export const fetchReleases = internalAction({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/releases`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${args.installationToken}`,
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
      body: release.body ?? undefined,
      createdAt: new Date(release.created_at).getTime(),
      githubReleaseId: String(release.id),
      htmlUrl: release.html_url,
      isDraft: release.draft,
      isPrerelease: release.prerelease,
      name: release.name ?? undefined,
      publishedAt: release.published_at
        ? new Date(release.published_at).getTime()
        : undefined,
      tagName: release.tag_name,
    }));
  },
});

/**
 * Create a webhook on a GitHub repository
 */
