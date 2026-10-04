/**
 * User-facing actions for the GitHub integration.
 * Called directly from the React client via useAction().
 * Reads check org membership via getConnection; writes require an org admin.
 */
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { action } from "../../_generated/server";
import { authComponent } from "../../auth/auth";
import { randomSecretHex } from "../../shared/hmac";
import { isOrgAdmin } from "../../shared/membership";
import type { GithubIssueRef } from "./issue_promote";
import { isRepositoryAccessible } from "./user_access";

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

async function requireAdminConnection(
  ctx: ActionCtx,
  organizationId: Id<"organizations">
): Promise<Doc<"githubConnections"> & { repositoryFullName: string }> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  const membership = await ctx.runQuery(
    internal.shared.access.membershipForUser,
    { organizationId, userId: user._id }
  );
  if (!isOrgAdmin(membership?.role)) {
    throw new Error("Only admins can manage the GitHub integration");
  }

  const connection = await ctx.runQuery(
    internal.integrations.github.queries.getConnectionInternal,
    { organizationId }
  );
  if (!connection) {
    throw new Error("No GitHub connection found");
  }
  const { repositoryFullName } = connection;
  if (!repositoryFullName) {
    throw new Error("No repository connected");
  }
  return { ...connection, repositoryFullName };
}

/**
 * Fetch installation repositories the connecting GitHub user can access.
 */
export const listRepositories = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Repository[]> => {
    const memberVisibleConnection = await ctx.runQuery(
      api.integrations.github.queries.getConnection,
      { organizationId: args.organizationId }
    );
    const connection = memberVisibleConnection
      ? await ctx.runQuery(
          internal.integrations.github.queries.getConnectionInternal,
          { organizationId: args.organizationId }
        )
      : null;

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    const { accessibleRepositories } = connection;
    if (!accessibleRepositories) {
      throw new Error(
        "Reconnect GitHub to confirm which repositories you can access."
      );
    }

    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: connection.installationId }
    );

    const repos: Repository[] = await ctx.runAction(
      internal.integrations.github.actions.fetchRepositories,
      { installationToken: token }
    );

    return repos.filter((repo) =>
      isRepositoryAccessible(accessibleRepositories, repo)
    );
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
      internal.integrations.github.issue_actions.fetchLabels,
      {
        installationToken: token,
        repositoryFullName: connection.repositoryFullName,
      }
    );

    return labels;
  },
});

/**
 * Sync issues from GitHub into the database.
 */
export const syncIssues = action({
  args: {
    labels: v.optional(v.string()),
    organizationId: v.id("organizations"),
    state: v.optional(
      v.union(v.literal("open"), v.literal("closed"), v.literal("all"))
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; synced: number; imported: number }> => {
    const connection = await requireAdminConnection(ctx, args.organizationId);

    await ctx.runMutation(
      internal.integrations.github.issue_sync.updateIssuesSyncStatus,
      { connectionId: connection._id, status: "syncing" }
    );

    try {
      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );

      const issues = await ctx.runAction(
        internal.integrations.github.issue_actions.fetchIssues,
        {
          installationToken: token,
          labels: args.labels,
          repositoryFullName: connection.repositoryFullName,
          state: args.state ?? "all",
        }
      );

      await ctx.runMutation(
        internal.integrations.github.issue_sync.saveSyncedIssues,
        {
          issues,
          organizationId: args.organizationId,
        }
      );

      const importResult = await ctx.runMutation(
        internal.integrations.github.issue_mappings.autoImportIssuesByLabel,
        { organizationId: args.organizationId }
      );

      return {
        imported: importResult.imported,
        success: true,
        synced: issues.length,
      };
    } catch (error) {
      await ctx.runMutation(
        internal.integrations.github.issue_sync.updateIssuesSyncStatus,
        {
          connectionId: connection._id,
          error: error instanceof Error ? error.message : "Unknown error",
          status: "error",
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
    const connection = await requireAdminConnection(ctx, args.organizationId);

    if (connection.webhookId) {
      return { success: true, webhook: { id: connection.webhookId } };
    }

    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: connection.installationId }
    );

    const webhookSecret = randomSecretHex();

    const convexSiteUrl = process.env.CONVEX_SITE_URL ?? "";
    const webhookUrl = `${convexSiteUrl}/github-webhook`;

    const webhookResult = await ctx.runAction(
      internal.integrations.github.webhook_actions.createWebhook,
      {
        installationToken: token,
        repositoryFullName: connection.repositoryFullName,
        secret: webhookSecret,
        webhookUrl,
      }
    );

    await ctx.runMutation(
      internal.integrations.github.mutations.updateWebhook,
      {
        connectionId: connection._id,
        webhookId: webhookResult.webhookId,
        webhookSecret,
      }
    );

    return { success: true, webhook: { id: webhookResult.webhookId } };
  },
});

export const createIssueFromFeedback = action({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args): Promise<GithubIssueRef> => {
    const feedback = await ctx.runQuery(api.feedback.queries.get, {
      id: args.feedbackId,
    });
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    const isAdmin = feedback.role === "admin" || feedback.role === "owner";
    if (!isAdmin) {
      throw new Error("Only admins can create GitHub issues");
    }
    return await ctx.runAction(
      internal.integrations.github.issue_promote.promoteFeedback,
      { feedbackId: args.feedbackId, organizationId: feedback.organizationId }
    );
  },
});
