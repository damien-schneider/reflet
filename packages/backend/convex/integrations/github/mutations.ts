import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { requireOrgAdmin } from "../../shared/access";

export const selectRepository = mutation({
  args: {
    defaultBranch: v.string(),
    organizationId: v.id("organizations"),
    repositoryFullName: v.string(),
    repositoryId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(
      ctx,
      args.organizationId,
      "configure GitHub repository"
    );

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

export const updateWebhook = mutation({
  args: {
    organizationId: v.id("organizations"),
    webhookId: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "configure webhook");

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

export const toggleAutoSync = mutation({
  args: {
    enabled: v.boolean(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "configure sync settings");

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

export const disconnect = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "disconnect GitHub");

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

export const logWebhookEvent = internalMutation({
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
