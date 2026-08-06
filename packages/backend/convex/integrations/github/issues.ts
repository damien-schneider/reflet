import { v } from "convex/values";
import { query } from "../../_generated/server";
import { isOrgMemberViewer } from "../../shared/access";

export const getLabelMappings = query({
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
          tagColor: tag?.color,
          tagName: tag?.name,
        };
      })
    );

    return enrichedMappings;
  },
});

export const getIssueSyncStatus = query({
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
        autoSync: false,
        isEnabled: false,
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
      autoSync: connection.autoSyncIssues ?? false,
      importedCount: issues.filter((i) => i.refletFeedbackId).length,
      isEnabled: connection.issuesSyncEnabled ?? false,
      lastSyncAt: connection.lastIssuesSyncAt,
      lastSyncError: connection.lastIssuesSyncError,
      lastSyncStatus: connection.lastIssuesSyncStatus,
      mappingsCount: mappings.length,
      syncedIssuesCount: issues.length,
    };
  },
});
