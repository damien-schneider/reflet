import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

/**
 * Create or update a label mapping
 */
export const upsertLabelMapping = mutation({
  args: {
    organizationId: v.id("organizations"),
    githubLabelName: v.string(),
    githubLabelColor: v.optional(v.string()),
    targetTagId: v.optional(v.id("tags")),
    autoSync: v.boolean(),
    syncClosedIssues: v.optional(v.boolean()),
    defaultStatus: v.optional(
      v.union(
        v.literal("open"),
        v.literal("under_review"),
        v.literal("planned"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("closed")
      )
    ),
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
      throw new Error("Only admins can configure label mappings");
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

    const now = Date.now();

    // Check if mapping already exists
    const existing = await ctx.db
      .query("githubLabelMappings")
      .withIndex("by_connection_label", (q) =>
        q
          .eq("githubConnectionId", connection._id)
          .eq("githubLabelName", args.githubLabelName)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        githubLabelColor: args.githubLabelColor,
        targetTagId: args.targetTagId,
        autoSync: args.autoSync,
        syncClosedIssues: args.syncClosedIssues,
        defaultStatus: args.defaultStatus,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new
    const mappingId = await ctx.db.insert("githubLabelMappings", {
      organizationId: args.organizationId,
      githubConnectionId: connection._id,
      githubLabelName: args.githubLabelName,
      githubLabelColor: args.githubLabelColor,
      targetTagId: args.targetTagId,
      autoSync: args.autoSync,
      syncClosedIssues: args.syncClosedIssues,
      defaultStatus: args.defaultStatus,
      createdAt: now,
      updatedAt: now,
    });

    return mappingId;
  },
});

/**
 * Delete a label mapping
 */
export const deleteLabelMapping = mutation({
  args: {
    mappingId: v.id("githubLabelMappings"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const mapping = await ctx.db.get(args.mappingId);
    if (!mapping) {
      throw new Error("Mapping not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", mapping.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete label mappings");
    }

    await ctx.db.delete(args.mappingId);
    return true;
  },
});

/**
 * Toggle issues sync
 */
export const toggleIssuesSync = mutation({
  args: {
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
    autoSync: v.optional(v.boolean()),
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
      throw new Error("Only admins can configure issues sync");
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
      issuesSyncEnabled: args.enabled,
      autoSyncIssues: args.autoSync ?? args.enabled,
      updatedAt: Date.now(),
    });

    return connection._id;
  },
});

/**
 * Update issues sync status (called internally)
 */
export const updateIssuesSyncStatus = mutation({
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
      lastIssuesSyncStatus: args.status,
      lastIssuesSyncError: args.error,
      lastIssuesSyncAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Save synced GitHub issues
 */
export const saveSyncedIssues = mutation({
  args: {
    organizationId: v.id("organizations"),
    issues: v.array(
      v.object({
        githubIssueId: v.string(),
        githubIssueNumber: v.number(),
        title: v.string(),
        body: v.optional(v.string()),
        htmlUrl: v.string(),
        state: v.union(v.literal("open"), v.literal("closed")),
        githubLabels: v.array(v.string()),
        githubAuthor: v.optional(v.string()),
        githubAuthorAvatarUrl: v.optional(v.string()),
        githubMilestone: v.optional(v.string()),
        githubAssignees: v.optional(v.array(v.string())),
        githubCreatedAt: v.number(),
        githubUpdatedAt: v.number(),
        githubClosedAt: v.optional(v.number()),
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

    for (const issue of args.issues) {
      // Check if issue already exists
      const existing = await ctx.db
        .query("githubIssues")
        .withIndex("by_github_issue_id", (q) =>
          q
            .eq("githubConnectionId", connection._id)
            .eq("githubIssueId", issue.githubIssueId)
        )
        .first();

      if (existing) {
        // Update existing
        await ctx.db.patch(existing._id, {
          title: issue.title,
          body: issue.body,
          htmlUrl: issue.htmlUrl,
          state: issue.state,
          githubLabels: issue.githubLabels,
          githubAuthor: issue.githubAuthor,
          githubAuthorAvatarUrl: issue.githubAuthorAvatarUrl,
          githubMilestone: issue.githubMilestone,
          githubAssignees: issue.githubAssignees,
          githubUpdatedAt: issue.githubUpdatedAt,
          githubClosedAt: issue.githubClosedAt,
          lastSyncedAt: now,
        });
      } else {
        // Insert new
        await ctx.db.insert("githubIssues", {
          organizationId: args.organizationId,
          githubConnectionId: connection._id,
          githubIssueId: issue.githubIssueId,
          githubIssueNumber: issue.githubIssueNumber,
          title: issue.title,
          body: issue.body,
          htmlUrl: issue.htmlUrl,
          state: issue.state,
          githubLabels: issue.githubLabels,
          githubAuthor: issue.githubAuthor,
          githubAuthorAvatarUrl: issue.githubAuthorAvatarUrl,
          githubMilestone: issue.githubMilestone,
          githubAssignees: issue.githubAssignees,
          githubCreatedAt: issue.githubCreatedAt,
          githubUpdatedAt: issue.githubUpdatedAt,
          githubClosedAt: issue.githubClosedAt,
          lastSyncedAt: now,
        });
      }
    }

    // Update connection sync status
    await ctx.db.patch(connection._id, {
      lastIssuesSyncAt: now,
      lastIssuesSyncStatus: "success",
      updatedAt: now,
    });

    return { synced: args.issues.length };
  },
});
