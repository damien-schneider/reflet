import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

// ============================================
// MUTATIONS
// ============================================

/**
 * Select repository to connect
 */
export const selectRepository = mutation({
  args: {
    defaultBranch: v.string(),
    organizationId: v.id("organizations"),
    repositoryFullName: v.string(),
    repositoryId: v.string(),
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
      repositoryDefaultBranch: args.defaultBranch,
      repositoryFullName: args.repositoryFullName,
      repositoryId: args.repositoryId,
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
      updatedAt: Date.now(),
      webhookId: args.webhookId,
      webhookSecret: args.webhookSecret,
    });

    return connection._id;
  },
});

/**
 * Enable/disable CI workflow
 */
export const updateCiSettings = mutation({
  args: {
    ciBranch: v.optional(v.string()),
    ciEnabled: v.boolean(),
    ciWorkflowCreated: v.optional(v.boolean()),
    organizationId: v.id("organizations"),
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
      ciBranch: args.ciBranch,
      ciEnabled: args.ciEnabled,
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
    enabled: v.boolean(),
    organizationId: v.id("organizations"),
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
    error: v.optional(v.string()),
    status: v.union(
      v.literal("idle"),
      v.literal("syncing"),
      v.literal("success"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: Date.now(),
      lastSyncError: args.error,
      lastSyncStatus: args.status,
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
        body: v.optional(v.string()),
        createdAt: v.number(),
        githubReleaseId: v.string(),
        htmlUrl: v.string(),
        isDraft: v.boolean(),
        isPrerelease: v.boolean(),
        name: v.optional(v.string()),
        publishedAt: v.optional(v.number()),
        tagName: v.string(),
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
          body: release.body,
          htmlUrl: release.htmlUrl,
          isDraft: release.isDraft,
          isPrerelease: release.isPrerelease,
          lastSyncedAt: now,
          name: release.name,
          publishedAt: release.publishedAt,
          tagName: release.tagName,
        });
      } else {
        await ctx.db.insert("githubReleases", {
          body: release.body,
          createdAt: release.createdAt,
          githubConnectionId: connection._id,
          githubReleaseId: release.githubReleaseId,
          htmlUrl: release.htmlUrl,
          isDraft: release.isDraft,
          isPrerelease: release.isPrerelease,
          lastSyncedAt: now,
          name: release.name,
          organizationId: args.organizationId,
          publishedAt: release.publishedAt,
          tagName: release.tagName,
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
    autoPublish: v.optional(v.boolean()),
    githubReleaseId: v.id("githubReleases"),
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
      createdAt: now,
      description: githubRelease.body,
      githubHtmlUrl: githubRelease.htmlUrl,
      githubReleaseId: githubRelease.githubReleaseId,
      organizationId: githubRelease.organizationId,
      publishedAt: args.autoPublish ? now : undefined,
      syncedFromGithub: true,
      title: githubRelease.name || githubRelease.tagName,
      updatedAt: now,
      version: githubRelease.tagName,
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
    action: v.optional(v.string()),
    connectionId: v.id("githubConnections"),
    eventType: v.string(),
    organizationId: v.id("organizations"),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("githubWebhookEvents", {
      action: args.action,
      createdAt: Date.now(),
      eventType: args.eventType,
      githubConnectionId: args.connectionId,
      organizationId: args.organizationId,
      payload: args.payload.slice(0, 10_000),
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
    accountAvatarUrl: v.optional(v.string()),
    accountLogin: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    installationId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userGithubConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accountAvatarUrl: args.accountAvatarUrl,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        installationId: args.installationId,
        status: "connected",
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userGithubConnections", {
      accountAvatarUrl: args.accountAvatarUrl,
      accountLogin: args.accountLogin,
      accountType: args.accountType,
      createdAt: now,
      installationId: args.installationId,
      status: "connected",
      updatedAt: now,
      userId: args.userId,
    });
  },
});

/**
 * Link a repo to an org using a team member's GitHub installation
 * Creates or updates a githubConnections row with linkedByUserId
 */
export const linkRepoToOrg = internalMutation({
  args: {
    linkedByUserId: v.string(),
    organizationId: v.id("organizations"),
    userGithubConnectionId: v.id("userGithubConnections"),
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
        accountAvatarUrl: userConnection.accountAvatarUrl,
        accountLogin: userConnection.accountLogin,
        accountType: userConnection.accountType,
        installationId: userConnection.installationId,
        linkedByUserId: args.linkedByUserId,
        status: "connected",
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("githubConnections", {
      accountAvatarUrl: userConnection.accountAvatarUrl,
      accountLogin: userConnection.accountLogin,
      accountType: userConnection.accountType,
      createdAt: now,
      installationId: userConnection.installationId,
      linkedByUserId: args.linkedByUserId,
      organizationId: args.organizationId,
      status: "connected",
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
    githubHtmlUrl: v.string(),
    githubReleaseId: v.string(),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.releaseId, {
      githubHtmlUrl: args.githubHtmlUrl,
      githubReleaseId: args.githubReleaseId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update GitHub push status on a release
 */
export const updateGithubPushStatus = internalMutation({
  args: {
    error: v.optional(v.string()),
    errorType: v.optional(v.string()),
    releaseId: v.id("releases"),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.releaseId, {
      githubPushError: args.error,
      githubPushErrorType: args.errorType,
      githubPushStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});
