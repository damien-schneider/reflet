import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

/**
 * Get all label mappings for an organization
 */
export const getLabelMappings = query({
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

    const mappings = await ctx.db
      .query("githubLabelMappings")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    // Enrich with tag names
    const enrichedMappings = await Promise.all(
      mappings.map(async (mapping) => {
        const tag = mapping.targetTagId
          ? await ctx.db.get(mapping.targetTagId)
          : null;

        return {
          ...mapping,
          tagName: tag?.name,
          tagColor: tag?.color,
        };
      })
    );

    return enrichedMappings;
  },
});

/**
 * Get synced GitHub issues for an organization
 */
export const listGithubIssues = query({
  args: {
    organizationId: v.id("organizations"),
    state: v.optional(v.union(v.literal("open"), v.literal("closed"))),
    limit: v.optional(v.number()),
  },
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

    let issues = await ctx.db
      .query("githubIssues")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    // Filter by state if provided
    if (args.state) {
      issues = issues.filter((issue) => issue.state === args.state);
    }

    // Sort by GitHub updated date descending
    issues.sort((a, b) => b.githubUpdatedAt - a.githubUpdatedAt);

    // Apply limit
    if (args.limit) {
      issues = issues.slice(0, args.limit);
    }

    return issues;
  },
});

/**
 * Get issue sync status
 */
export const getIssueSyncStatus = query({
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
        isEnabled: false,
        autoSync: false,
        lastSyncAt: undefined,
        lastSyncStatus: undefined,
        mappingsCount: 0,
        syncedIssuesCount: 0,
      };
    }

    // Count mappings
    const mappings = await ctx.db
      .query("githubLabelMappings")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    // Count synced issues
    const issues = await ctx.db
      .query("githubIssues")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    return {
      isEnabled: connection.issuesSyncEnabled ?? false,
      autoSync: connection.autoSyncIssues ?? false,
      lastSyncAt: connection.lastIssuesSyncAt,
      lastSyncStatus: connection.lastIssuesSyncStatus,
      lastSyncError: connection.lastIssuesSyncError,
      mappingsCount: mappings.length,
      syncedIssuesCount: issues.length,
      importedCount: issues.filter((i) => i.refletFeedbackId).length,
    };
  },
});
