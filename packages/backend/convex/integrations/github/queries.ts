import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

// ============================================
// QUERIES
// ============================================

/**
 * Get GitHub connection for an organization
 */
export const getConnection = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    return connection;
  },
});

/**
 * List synced GitHub releases for an organization
 */
export const listGithubReleases = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      return [];
    }

    const releases = await ctx.db
      .query("githubReleases")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    releases.sort(
      (a, b) => (b.publishedAt || b.createdAt) - (a.publishedAt || a.createdAt)
    );

    return releases;
  },
});

/**
 * Get connection status summary for display
 */
export const getConnectionStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      return {
        isConnected: false,
        hasRepository: false,
        hasWebhook: false,
        hasCiSetup: false,
        autoSyncEnabled: false,
      };
    }

    return {
      isConnected: connection.status === "connected",
      hasRepository: Boolean(connection.repositoryId),
      repositoryFullName: connection.repositoryFullName,
      hasWebhook: Boolean(connection.webhookId),
      hasCiSetup: Boolean(connection.ciWorkflowCreated),
      autoSyncEnabled: Boolean(connection.autoSyncReleases),
      lastSyncAt: connection.lastSyncAt,
      lastSyncStatus: connection.lastSyncStatus,
      accountLogin: connection.accountLogin,
      accountAvatarUrl: connection.accountAvatarUrl,
    };
  },
});

/**
 * Get release sync status: GitHub-only, Reflet-only, and synced releases
 */
export const getReleaseSyncStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return { githubOnly: [], refletOnly: [], synced: [] };
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      return { githubOnly: [], refletOnly: [], synced: [] };
    }

    const githubReleases = await ctx.db
      .query("githubReleases")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    const refletReleases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const linkedGithubIds = new Set(
      refletReleases
        .filter((r) => r.githubReleaseId)
        .map((r) => r.githubReleaseId)
    );

    const githubOnly = githubReleases
      .filter(
        (gr) => !(gr.refletReleaseId || linkedGithubIds.has(gr.githubReleaseId))
      )
      .map((gr) => ({
        _id: gr._id,
        githubReleaseId: gr.githubReleaseId,
        tagName: gr.tagName,
        name: gr.name,
        htmlUrl: gr.htmlUrl,
        publishedAt: gr.publishedAt,
        createdAt: gr.createdAt,
      }));

    const refletOnly = refletReleases
      .filter((r) => r.publishedAt && !r.githubReleaseId && !r.syncedFromGithub)
      .map((r) => ({
        _id: r._id,
        title: r.title,
        version: r.version,
        publishedAt: r.publishedAt,
        githubPushStatus: r.githubPushStatus,
        githubPushError: r.githubPushError,
        githubPushErrorType: r.githubPushErrorType,
      }));

    const synced = refletReleases
      .filter((r) => r.githubReleaseId)
      .map((r) => ({
        _id: r._id,
        title: r.title,
        version: r.version,
        publishedAt: r.publishedAt,
        githubReleaseId: r.githubReleaseId,
        githubHtmlUrl: r.githubHtmlUrl,
      }));

    return { githubOnly, refletOnly, synced };
  },
});

// ============================================
// INTERNAL QUERIES (called from actions, not from client)
// ============================================

/**
 * Internal query to get GitHub connection by installation ID
 */
export const getConnectionByInstallation = internalQuery({
  args: { installationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("githubConnections")
      .withIndex("by_installation", (q) =>
        q.eq("installationId", args.installationId)
      )
      .first();
  },
});

/**
 * Internal query to get GitHub connection for an organization
 */
export const getConnectionInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    return connection;
  },
});
