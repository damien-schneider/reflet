import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

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
