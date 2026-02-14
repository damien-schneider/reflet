"use node";

import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const GITHUB_API_URL = "https://api.github.com";

/**
 * Sync all releases from GitHub to the githubReleases table.
 * Fetches releases via the GitHub API and saves them locally
 * so getReleaseSyncStatus can show what's available to import.
 */
export const syncAllReleases = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.github.getConnectionInternal,
      { organizationId: args.organizationId }
    );

    if (!connection?.repositoryFullName) {
      console.error(
        "[GitHub Sync] No connection or repository for org:",
        args.organizationId
      );
      return;
    }

    // Update sync status to syncing
    await ctx.runMutation(api.github.updateSyncStatus, {
      connectionId: connection._id,
      status: "syncing",
    });

    try {
      const { token } = await ctx.runAction(
        internal.github_node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );

      // Fetch all releases from GitHub
      const response = await fetch(
        `${GITHUB_API_URL}/repos/${connection.repositoryFullName}/releases?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
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

      const mapped = releases.map((release) => ({
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

      await ctx.runMutation(api.github.saveSyncedReleases, {
        organizationId: args.organizationId,
        releases: mapped,
      });
    } catch (error) {
      console.error("[GitHub Sync] Failed:", error);
      await ctx.runMutation(api.github.updateSyncStatus, {
        connectionId: connection._id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});
