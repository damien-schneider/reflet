/**
 * User-facing actions for the GitHub integration.
 * Called directly from the React client via useAction().
 * Auth is verified by calling getConnection (which checks org membership).
 */
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { action } from "../../_generated/server";

interface Repository {
  defaultBranch: string;
  description: string | null;
  fullName: string;
  id: string;
  isPrivate: boolean;
  name: string;
}

interface Label {
  color: string;
  description: string | null;
  id: string;
  name: string;
}

/**
 * Fetch repositories available to the GitHub App installation.
 */
export const listRepositories = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Repository[]> => {
    // getConnection checks auth + org membership
    const connection = await ctx.runQuery(
      api.integrations.github.queries.getConnection,
      { organizationId: args.organizationId }
    );

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: connection.installationId }
    );

    const repos: Repository[] = await ctx.runAction(
      api.integrations.github.actions.fetchRepositories,
      { installationToken: token }
    );

    return repos;
  },
});

/**
 * Fetch labels from the connected repository.
 */
export const listLabels = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Label[]> => {
    const connection = await ctx.runQuery(
      api.integrations.github.queries.getConnection,
      { organizationId: args.organizationId }
    );

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    if (!connection.repositoryFullName) {
      throw new Error("No repository connected");
    }

    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: connection.installationId }
    );

    const labels: Label[] = await ctx.runAction(
      api.integrations.github.actions.fetchLabels,
      {
        installationToken: token,
        repositoryFullName: connection.repositoryFullName,
      }
    );

    return labels;
  },
});

/**
 * Sync releases from GitHub into the database.
 */
export const syncReleases = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; synced: number }> => {
    const connection = await ctx.runQuery(
      api.integrations.github.queries.getConnection,
      { organizationId: args.organizationId }
    );

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    if (!connection.repositoryFullName) {
      throw new Error("No repository connected");
    }

    await ctx.runMutation(api.integrations.github.mutations.updateSyncStatus, {
      connectionId: connection._id,
      status: "syncing",
    });

    try {
      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );

      const releases = await ctx.runAction(
        api.integrations.github.actions.fetchReleases,
        {
          installationToken: token,
          repositoryFullName: connection.repositoryFullName,
        }
      );

      await ctx.runMutation(
        api.integrations.github.mutations.saveSyncedReleases,
        { organizationId: args.organizationId, releases }
      );

      return { success: true, synced: releases.length };
    } catch (error) {
      await ctx.runMutation(
        api.integrations.github.mutations.updateSyncStatus,
        {
          connectionId: connection._id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
      throw error;
    }
  },
});

/**
 * Sync issues from GitHub into the database.
 */
export const syncIssues = action({
  args: {
    organizationId: v.id("organizations"),
    state: v.optional(
      v.union(v.literal("open"), v.literal("closed"), v.literal("all"))
    ),
    labels: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; synced: number; imported: number }> => {
    const connection = await ctx.runQuery(
      api.integrations.github.queries.getConnection,
      { organizationId: args.organizationId }
    );

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    if (!connection.repositoryFullName) {
      throw new Error("No repository connected");
    }

    await ctx.runMutation(
      api.integrations.github.issues.updateIssuesSyncStatus,
      { connectionId: connection._id, status: "syncing" }
    );

    try {
      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );

      const issues = await ctx.runAction(
        api.integrations.github.actions.fetchIssues,
        {
          installationToken: token,
          repositoryFullName: connection.repositoryFullName,
          state: args.state ?? "all",
          labels: args.labels,
        }
      );

      await ctx.runMutation(api.integrations.github.issues.saveSyncedIssues, {
        organizationId: args.organizationId,
        issues,
      });

      const importResult = await ctx.runMutation(
        api.integrations.github.issues.autoImportIssuesByLabel,
        { organizationId: args.organizationId }
      );

      return {
        success: true,
        synced: issues.length,
        imported: importResult.imported,
      };
    } catch (error) {
      await ctx.runMutation(
        api.integrations.github.issues.updateIssuesSyncStatus,
        {
          connectionId: connection._id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
      throw error;
    }
  },
});

/**
 * Setup webhook for the connected repository.
 */
export const setupWebhook = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; webhook: { id: string } }> => {
    const connection = await ctx.runQuery(
      api.integrations.github.queries.getConnection,
      { organizationId: args.organizationId }
    );

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    if (!connection.repositoryFullName) {
      throw new Error("No repository connected");
    }

    if (connection.webhookId) {
      return { success: true, webhook: { id: connection.webhookId } };
    }

    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: connection.installationId }
    );

    // Generate webhook secret
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const webhookSecret = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const convexSiteUrl = process.env.CONVEX_SITE_URL ?? "";
    const webhookUrl = `${convexSiteUrl}/github-webhook`;

    const webhookResult = await ctx.runAction(
      api.integrations.github.actions.createWebhook,
      {
        installationToken: token,
        repositoryFullName: connection.repositoryFullName,
        webhookUrl,
        secret: webhookSecret,
      }
    );

    await ctx.runMutation(api.integrations.github.mutations.updateWebhook, {
      organizationId: args.organizationId,
      webhookId: webhookResult.webhookId,
      webhookSecret,
    });

    return { success: true, webhook: { id: webhookResult.webhookId } };
  },
});
