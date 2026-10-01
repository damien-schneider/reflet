import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { action, internalAction } from "../../_generated/server";
import { authComponent } from "../../auth/auth";
import { isOrgAdmin } from "../../shared/membership";
import { GITHUB_API_URL } from "./github_constants";
import { fetchAllPages } from "./github_pagination";
import { resolveUserInstallation } from "./user_access";

/**
 * Connects a GitHub App installation for the authenticated caller. Only the
 * caller's own GitHub token decides which installation and repositories they
 * reach — nothing about the installation is taken from the request.
 */
export const connectInstallation = action({
  args: {
    githubUserToken: v.string(),
    installationId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
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

    const previousConnection = await ctx.runQuery(
      internal.integrations.github.queries.getUserGithubConnection,
      { userId: user._id }
    );
    const installation = await resolveUserInstallation(args.githubUserToken, {
      previousInstallationId: previousConnection?.installationId,
      requestedInstallationId: args.installationId,
    });
    if (!installation) {
      return { status: "needs_installation" as const };
    }

    const { accessibleRepositories, ...account } = installation;
    const userConnectionId = await ctx.runMutation(
      internal.integrations.github.installation_mutations.saveUserInstallation,
      { ...account, userId: user._id }
    );

    if (args.organizationId) {
      await ctx.runMutation(
        internal.integrations.github.installation_mutations.linkRepoToOrg,
        {
          accessibleRepositories,
          linkedByUserId: user._id,
          organizationId: args.organizationId,
          userGithubConnectionId: userConnectionId,
        }
      );
    }

    return { status: "connected" as const };
  },
  returns: v.union(
    v.object({ status: v.literal("connected") }),
    v.object({ status: v.literal("needs_installation") })
  ),
});

const installationRepositoriesPageSchema = z.object({
  repositories: z.array(
    z.object({
      default_branch: z.string(),
      description: z.string().nullable(),
      full_name: z.string(),
      id: z.number(),
      name: z.string(),
      private: z.boolean(),
    })
  ),
});

export const fetchRepositories = internalAction({
  args: {
    installationToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const repositories = await fetchAllPages(
      `${GITHUB_API_URL}/installation/repositories?per_page=100`,
      args.installationToken,
      (page) => installationRepositoriesPageSchema.parse(page).repositories
    );

    return repositories.map((repo) => ({
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
