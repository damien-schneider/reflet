import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

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
