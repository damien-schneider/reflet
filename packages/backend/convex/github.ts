import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getAuthUser } from "./utils";

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

    // Verify membership
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

    // Verify membership
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

    // Sort by publishedAt descending
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

    // Verify membership
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

// ============================================
// MUTATIONS
// ============================================

/**
 * Save GitHub App installation (called after OAuth callback)
 */
export const saveInstallation = mutation({
  args: {
    organizationId: v.id("organizations"),
    installationId: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    accountLogin: v.string(),
    accountAvatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can connect GitHub");
    }

    // Check if connection already exists
    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        installationId: args.installationId,
        accountType: args.accountType,
        accountLogin: args.accountLogin,
        accountAvatarUrl: args.accountAvatarUrl,
        status: "connected",
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new connection
    const connectionId = await ctx.db.insert("githubConnections", {
      organizationId: args.organizationId,
      installationId: args.installationId,
      accountType: args.accountType,
      accountLogin: args.accountLogin,
      accountAvatarUrl: args.accountAvatarUrl,
      status: "connected",
      createdAt: now,
      updatedAt: now,
    });

    return connectionId;
  },
});

/**
 * Select repository to connect
 */
export const selectRepository = mutation({
  args: {
    organizationId: v.id("organizations"),
    repositoryId: v.string(),
    repositoryFullName: v.string(),
    defaultBranch: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can configure GitHub repository");
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    await ctx.db.patch(connection._id, {
      repositoryId: args.repositoryId,
      repositoryFullName: args.repositoryFullName,
      repositoryDefaultBranch: args.defaultBranch,
      updatedAt: Date.now(),
    });

    return connection._id;
  },
});

/**
 * Update webhook configuration
 */
export const updateWebhook = mutation({
  args: {
    organizationId: v.id("organizations"),
    webhookId: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can configure webhook");
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    await ctx.db.patch(connection._id, {
      webhookId: args.webhookId,
      webhookSecret: args.webhookSecret,
      updatedAt: Date.now(),
    });

    return connection._id;
  },
});

/**
 * Enable/disable CI workflow
 */
export const updateCiSettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    ciEnabled: v.boolean(),
    ciBranch: v.optional(v.string()),
    ciWorkflowCreated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can configure CI settings");
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    await ctx.db.patch(connection._id, {
      ciEnabled: args.ciEnabled,
      ciBranch: args.ciBranch,
      ciWorkflowCreated: args.ciWorkflowCreated,
      updatedAt: Date.now(),
    });

    return connection._id;
  },
});

/**
 * Toggle auto-sync releases
 */
export const toggleAutoSync = mutation({
  args: {
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can configure sync settings");
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    await ctx.db.patch(connection._id, {
      autoSyncReleases: args.enabled,
      updatedAt: Date.now(),
    });

    return connection._id;
  },
});

/**
 * Update sync status (called internally after sync operations)
 */
export const updateSyncStatus = mutation({
  args: {
    connectionId: v.id("githubConnections"),
    status: v.union(
      v.literal("idle"),
      v.literal("syncing"),
      v.literal("success"),
      v.literal("error")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      lastSyncStatus: args.status,
      lastSyncError: args.error,
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Save synced GitHub releases
 */
export const saveSyncedReleases = mutation({
  args: {
    organizationId: v.id("organizations"),
    releases: v.array(
      v.object({
        githubReleaseId: v.string(),
        tagName: v.string(),
        name: v.optional(v.string()),
        body: v.optional(v.string()),
        htmlUrl: v.string(),
        isDraft: v.boolean(),
        isPrerelease: v.boolean(),
        publishedAt: v.optional(v.number()),
        createdAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    const now = Date.now();

    for (const release of args.releases) {
      // Check if release already exists
      const existing = await ctx.db
        .query("githubReleases")
        .withIndex("by_github_release_id", (q) =>
          q
            .eq("githubConnectionId", connection._id)
            .eq("githubReleaseId", release.githubReleaseId)
        )
        .first();

      if (existing) {
        // Update existing
        await ctx.db.patch(existing._id, {
          tagName: release.tagName,
          name: release.name,
          body: release.body,
          htmlUrl: release.htmlUrl,
          isDraft: release.isDraft,
          isPrerelease: release.isPrerelease,
          publishedAt: release.publishedAt,
          lastSyncedAt: now,
        });
      } else {
        // Insert new
        await ctx.db.insert("githubReleases", {
          organizationId: args.organizationId,
          githubConnectionId: connection._id,
          githubReleaseId: release.githubReleaseId,
          tagName: release.tagName,
          name: release.name,
          body: release.body,
          htmlUrl: release.htmlUrl,
          isDraft: release.isDraft,
          isPrerelease: release.isPrerelease,
          publishedAt: release.publishedAt,
          createdAt: release.createdAt,
          lastSyncedAt: now,
        });
      }
    }

    // Update connection sync status
    await ctx.db.patch(connection._id, {
      lastSyncAt: now,
      lastSyncStatus: "success",
      updatedAt: now,
    });

    return { synced: args.releases.length };
  },
});

/**
 * Import a GitHub release as a Reflet release
 */
export const importGithubRelease = mutation({
  args: {
    githubReleaseId: v.id("githubReleases"),
    autoPublish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const githubRelease = await ctx.db.get(args.githubReleaseId);
    if (!githubRelease) {
      throw new Error("GitHub release not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", githubRelease.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can import releases");
    }

    // Check if already imported
    const existingRelease = await ctx.db
      .query("releases")
      .withIndex("by_github_release", (q) =>
        q
          .eq("organizationId", githubRelease.organizationId)
          .eq("githubReleaseId", githubRelease.githubReleaseId)
      )
      .first();

    if (existingRelease) {
      throw new Error("This release has already been imported");
    }

    const now = Date.now();

    // Create Reflet release
    const releaseId = await ctx.db.insert("releases", {
      organizationId: githubRelease.organizationId,
      title: githubRelease.name || githubRelease.tagName,
      description: githubRelease.body,
      version: githubRelease.tagName,
      publishedAt: args.autoPublish ? now : undefined,
      githubReleaseId: githubRelease.githubReleaseId,
      githubHtmlUrl: githubRelease.htmlUrl,
      syncedFromGithub: true,
      createdAt: now,
      updatedAt: now,
    });

    // Link the GitHub release to the Reflet release
    await ctx.db.patch(args.githubReleaseId, {
      refletReleaseId: releaseId,
    });

    return releaseId;
  },
});

/**
 * Disconnect GitHub from organization
 */
export const disconnect = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can disconnect GitHub");
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      return false;
    }

    // Delete all synced releases
    const releases = await ctx.db
      .query("githubReleases")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    for (const release of releases) {
      await ctx.db.delete(release._id);
    }

    // Delete webhook events
    const events = await ctx.db
      .query("githubWebhookEvents")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    // Delete the connection
    await ctx.db.delete(connection._id);

    return true;
  },
});

/**
 * Log webhook event (for debugging)
 */
export const logWebhookEvent = mutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("githubConnections"),
    eventType: v.string(),
    action: v.optional(v.string()),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("githubWebhookEvents", {
      organizationId: args.organizationId,
      githubConnectionId: args.connectionId,
      eventType: args.eventType,
      action: args.action,
      payload: args.payload.slice(0, 10_000), // Truncate to 10KB
      createdAt: Date.now(),
    });
  },
});

// ============================================
// INTERNAL MUTATIONS (called from actions, not from client)
// ============================================

/**
 * Internal mutation to save GitHub App installation
 * Called from github_actions.saveInstallationFromCallback action
 * No auth required since installation is verified via GitHub's API
 */
export const saveInstallationInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    installationId: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    accountLogin: v.string(),
    accountAvatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists
    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        installationId: args.installationId,
        accountType: args.accountType,
        accountLogin: args.accountLogin,
        accountAvatarUrl: args.accountAvatarUrl,
        status: "connected",
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new connection
    const connectionId = await ctx.db.insert("githubConnections", {
      organizationId: args.organizationId,
      installationId: args.installationId,
      accountType: args.accountType,
      accountLogin: args.accountLogin,
      accountAvatarUrl: args.accountAvatarUrl,
      status: "connected",
      createdAt: now,
      updatedAt: now,
    });

    return connectionId;
  },
});

/**
 * Internal mutation to handle GitHub App uninstallation
 * Called from webhook when user uninstalls the app from GitHub
 */
export const handleInstallationDeleted = internalMutation({
  args: {
    installationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the connection by installation ID
    const connection = await ctx.db
      .query("githubConnections")
      .filter((q) => q.eq(q.field("installationId"), args.installationId))
      .first();

    if (!connection) {
      return { deleted: false, reason: "not_found" };
    }

    // Delete all synced releases
    const releases = await ctx.db
      .query("githubReleases")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    for (const release of releases) {
      await ctx.db.delete(release._id);
    }

    // Delete webhook events
    const events = await ctx.db
      .query("githubWebhookEvents")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    // Delete label mappings
    const mappings = await ctx.db
      .query("githubLabelMappings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", connection.organizationId)
      )
      .collect();

    for (const mapping of mappings) {
      await ctx.db.delete(mapping._id);
    }

    // Delete the connection
    await ctx.db.delete(connection._id);

    return { deleted: true, organizationId: connection.organizationId };
  },
});

// ============================================
// INTERNAL QUERIES (called from actions, not from client)
// ============================================

/**
 * Internal query to get GitHub connection by installation ID
 * Used by webhook handler to look up the connection from the payload
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
 * Called from github_actions.getConnectionFromCallback action
 * No user auth required - used by API routes after verifying session
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

    // Get all GitHub releases for this connection
    const githubReleases = await ctx.db
      .query("githubReleases")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    // Get all Reflet releases for this org
    const refletReleases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Build a set of GitHub release IDs that are linked to Reflet releases
    const linkedGithubIds = new Set(
      refletReleases
        .filter((r) => r.githubReleaseId)
        .map((r) => r.githubReleaseId)
    );

    // GitHub-only: releases in githubReleases with no linked Reflet release
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

    // Reflet-only: published releases with no githubReleaseId and not synced from GitHub
    const refletOnly = refletReleases
      .filter((r) => r.publishedAt && !r.githubReleaseId && !r.syncedFromGithub)
      .map((r) => ({
        _id: r._id,
        title: r.title,
        version: r.version,
        publishedAt: r.publishedAt,
      }));

    // Synced: Reflet releases that have a githubReleaseId
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

/**
 * Link a GitHub release to a Reflet release after pushing to GitHub
 */
export const linkGithubRelease = internalMutation({
  args: {
    releaseId: v.id("releases"),
    githubReleaseId: v.string(),
    githubHtmlUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.releaseId, {
      githubReleaseId: args.githubReleaseId,
      githubHtmlUrl: args.githubHtmlUrl,
      updatedAt: Date.now(),
    });
  },
});
