import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalQuery, query } from "../../_generated/server";
import { isOrgMemberViewer } from "../../shared/access";

// ============================================
// QUERIES
// ============================================

/**
 * Get GitHub connection for an organization
 */
export const getConnection = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    if (!(await isOrgMemberViewer(ctx, args.organizationId))) {
      return null;
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      return null;
    }

    // webhookSecret verifies inbound GitHub payloads — server-side only
    const { webhookSecret, ...safeConnection } = connection;
    return safeConnection;
  },
});

/**
 * List synced GitHub releases for an organization
 */
export const listGithubReleases = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    if (!(await isOrgMemberViewer(ctx, args.organizationId))) {
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
    if (!(await isOrgMemberViewer(ctx, args.organizationId))) {
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
        autoSyncEnabled: false,
        hasCiSetup: false,
        hasRepository: false,
        hasWebhook: false,
        isConnected: false,
      };
    }

    return {
      accountAvatarUrl: connection.accountAvatarUrl,
      accountLogin: connection.accountLogin,
      autoSyncEnabled: Boolean(connection.autoSyncReleases),
      hasCiSetup: Boolean(connection.ciWorkflowCreated),
      hasRepository: Boolean(connection.repositoryId),
      hasWebhook: Boolean(connection.webhookId),
      isConnected: connection.status === "connected",
      isOwnerLeft: connection.status === "owner_left",
      lastSyncAt: connection.lastSyncAt,
      lastSyncStatus: connection.lastSyncStatus,
      linkedByUserId: connection.linkedByUserId,
      repositoryFullName: connection.repositoryFullName,
    };
  },
});

/**
 * Get release sync status: GitHub-only, Reflet-only, and synced releases
 */
export const getReleaseSyncStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    if (!(await isOrgMemberViewer(ctx, args.organizationId))) {
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
        createdAt: gr.createdAt,
        githubReleaseId: gr.githubReleaseId,
        htmlUrl: gr.htmlUrl,
        name: gr.name,
        publishedAt: gr.publishedAt,
        tagName: gr.tagName,
      }));

    const refletOnly = refletReleases
      .filter((r) => r.publishedAt && !r.githubReleaseId && !r.syncedFromGithub)
      .map((r) => ({
        _id: r._id,
        githubPushError: r.githubPushError,
        githubPushErrorType: r.githubPushErrorType,
        githubPushStatus: r.githubPushStatus,
        publishedAt: r.publishedAt,
        title: r.title,
        version: r.version,
      }));

    const synced = refletReleases
      .filter((r) => r.githubReleaseId)
      .map((r) => ({
        _id: r._id,
        githubHtmlUrl: r.githubHtmlUrl,
        githubReleaseId: r.githubReleaseId,
        publishedAt: r.publishedAt,
        title: r.title,
        version: r.version,
      }));

    return { githubOnly, refletOnly, synced };
  },
});

// ============================================
// INTERNAL QUERIES (called from actions, not from client)
// ============================================

/**
 * Get a user's GitHub connection by userId
 */
export const getUserGithubConnection = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("userGithubConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first(),
  returns: v.union(
    v.object({
      _creationTime: v.number(),
      _id: v.id("userGithubConnections"),
      accountAvatarUrl: v.optional(v.string()),
      accountLogin: v.string(),
      accountType: v.union(v.literal("user"), v.literal("organization")),
      createdAt: v.number(),
      installationId: v.string(),
      status: v.union(
        v.literal("connected"),
        v.literal("pending"),
        v.literal("error"),
        v.literal("owner_left")
      ),
      updatedAt: v.number(),
      userId: v.string(),
    }),
    v.null()
  ),
});

/**
 * Get all available GitHub installations from org members
 * Returns installations from members who have connected their GitHub
 */
export const getOrgAvailableInstallations = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const installations: Array<{
      _id: Id<"userGithubConnections">;
      userId: string;
      installationId: string;
      accountType: string;
      accountLogin: string;
      accountAvatarUrl?: string;
    }> = [];

    for (const member of members) {
      const connection = await ctx.db
        .query("userGithubConnections")
        .withIndex("by_user", (q) => q.eq("userId", member.userId))
        .first();

      if (connection && connection.status === "connected") {
        installations.push({
          _id: connection._id,
          accountAvatarUrl: connection.accountAvatarUrl,
          accountLogin: connection.accountLogin,
          accountType: connection.accountType,
          installationId: connection.installationId,
          userId: connection.userId,
        });
      }
    }

    return installations;
  },
});

/**
 * Internal query to get GitHub connection by installation ID
 */
export const getConnectionByInstallation = internalQuery({
  args: { installationId: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("githubConnections")
      .withIndex("by_installation", (q) =>
        q.eq("installationId", args.installationId)
      )
      .first(),
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
