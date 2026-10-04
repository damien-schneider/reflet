"use node";

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { GITHUB_API_URL } from "./github_constants";
import { fetchAllPages } from "./github_pagination";
import {
  githubApiReleaseSchema,
  toGithubReleaseSnapshot,
} from "./github_release_payload";

const releasesPageSchema = z.array(githubApiReleaseSchema);

export const syncAllReleases = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.integrations.github.queries.getConnectionInternal,
      { organizationId: args.organizationId }
    );

    if (!connection?.repositoryFullName) {
      return;
    }

    await ctx.runMutation(
      internal.integrations.github.release_mutations.updateSyncStatus,
      {
        connectionId: connection._id,
        status: "syncing",
      }
    );

    try {
      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );

      const releases = await fetchAllPages(
        `${GITHUB_API_URL}/repos/${connection.repositoryFullName}/releases?per_page=100`,
        token,
        (page) => releasesPageSchema.parse(page)
      );

      await ctx.runMutation(
        internal.integrations.github.release_mutations.saveSyncedReleases,
        {
          connectionId: connection._id,
          releases: releases.map(toGithubReleaseSnapshot),
        }
      );
    } catch (error) {
      await ctx.runMutation(
        internal.integrations.github.release_mutations.updateSyncStatus,
        {
          connectionId: connection._id,
          error: error instanceof Error ? error.message : "Unknown error",
          status: "error",
        }
      );
    }
  },
});
