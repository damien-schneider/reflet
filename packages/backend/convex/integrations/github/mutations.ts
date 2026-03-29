import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

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

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can connect GitHub");
    }

    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const now = Date.now();

    if (existing) {
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
      const existing = await ctx.db
        .query("githubReleases")
        .withIndex("by_github_release_id", (q) =>
          q
            .eq("githubConnectionId", connection._id)
            .eq("githubReleaseId", release.githubReleaseId)
        )
        .first();

      if (existing) {
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

    const releases = await ctx.db
      .query("githubReleases")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    for (const release of releases) {
      await ctx.db.delete(release._id);
    }

    const events = await ctx.db
      .query("githubWebhookEvents")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    for (const event of events) {
      await ctx.db.delete(event._id);
    }

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
      payload: args.payload.slice(0, 10_000),
      createdAt: Date.now(),
    });
  },
});

// ============================================
// INTERNAL MUTATIONS (called from actions, not from client)
// ============================================

/**
 * Internal mutation to save a user-level GitHub installation
 * Creates or updates a userGithubConnections row for the given user
 */
export const saveUserInstallation = internalMutation({
  args: {
    userId: v.string(),
    installationId: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    accountLogin: v.string(),
    accountAvatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userGithubConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
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

    return await ctx.db.insert("userGithubConnections", {
      userId: args.userId,
      installationId: args.installationId,
      accountType: args.accountType,
      accountLogin: args.accountLogin,
      accountAvatarUrl: args.accountAvatarUrl,
      status: "connected",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Link a repo to an org using a team member's GitHub installation
 * Creates or updates a githubConnections row with linkedByUserId
 */
export const linkRepoToOrg = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userGithubConnectionId: v.id("userGithubConnections"),
    linkedByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const userConnection = await ctx.db.get(args.userGithubConnectionId);
    if (!userConnection) {
      throw new Error("User GitHub connection not found");
    }

    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        installationId: userConnection.installationId,
        accountType: userConnection.accountType,
        accountLogin: userConnection.accountLogin,
        accountAvatarUrl: userConnection.accountAvatarUrl,
        linkedByUserId: args.linkedByUserId,
        status: "connected",
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("githubConnections", {
      organizationId: args.organizationId,
      installationId: userConnection.installationId,
      accountType: userConnection.accountType,
      accountLogin: userConnection.accountLogin,
      accountAvatarUrl: userConnection.accountAvatarUrl,
      linkedByUserId: args.linkedByUserId,
      status: "connected",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Handle a member being removed from an org
 * Marks any githubConnections linked by that user as "owner_left"
 */
export const handleMemberRemoved = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const connection of connections) {
      if (connection.linkedByUserId === args.userId) {
        await ctx.db.patch(connection._id, {
          status: "owner_left",
          updatedAt: Date.now(),
        });
      }
    }
  },
});

/**
 * Internal mutation to save GitHub App installation
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
    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const now = Date.now();

    if (existing) {
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
 * Marks userGithubConnections as error and deletes all org connections sharing that installationId
 */
export const handleInstallationDeleted = internalMutation({
  args: {
    installationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Mark user-level connection as error
    const userConnection = await ctx.db
      .query("userGithubConnections")
      .withIndex("by_installation", (q) =>
        q.eq("installationId", args.installationId)
      )
      .first();

    if (userConnection) {
      await ctx.db.patch(userConnection._id, {
        status: "error",
        updatedAt: Date.now(),
      });
    }

    // Find ALL org connections with this installationId and clean up
    const orgConnections = await ctx.db
      .query("githubConnections")
      .withIndex("by_installation", (q) =>
        q.eq("installationId", args.installationId)
      )
      .collect();

    if (orgConnections.length === 0 && !userConnection) {
      return { deleted: false, reason: "not_found" };
    }

    for (const connection of orgConnections) {
      const releases = await ctx.db
        .query("githubReleases")
        .withIndex("by_connection", (q) =>
          q.eq("githubConnectionId", connection._id)
        )
        .collect();

      for (const release of releases) {
        await ctx.db.delete(release._id);
      }

      const events = await ctx.db
        .query("githubWebhookEvents")
        .withIndex("by_connection", (q) =>
          q.eq("githubConnectionId", connection._id)
        )
        .collect();

      for (const event of events) {
        await ctx.db.delete(event._id);
      }

      const mappings = await ctx.db
        .query("githubLabelMappings")
        .withIndex("by_connection", (q) =>
          q.eq("githubConnectionId", connection._id)
        )
        .collect();

      for (const mapping of mappings) {
        await ctx.db.delete(mapping._id);
      }

      await ctx.db.delete(connection._id);
    }

    return { deleted: true };
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

/**
 * Update GitHub push status on a release
 */
export const updateGithubPushStatus = internalMutation({
  args: {
    releaseId: v.id("releases"),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    errorType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.releaseId, {
      githubPushStatus: args.status,
      githubPushError: args.error,
      githubPushErrorType: args.errorType,
      updatedAt: Date.now(),
    });
  },
});
