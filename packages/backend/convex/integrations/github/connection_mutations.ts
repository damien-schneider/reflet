import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

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
