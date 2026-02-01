import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./utils";

// ============================================
// QUERIES
// ============================================

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

// ============================================
// MUTATIONS
// ============================================

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

/**
 * Import a GitHub issue as Reflet feedback
 */
export const importGithubIssue = mutation({
  args: {
    githubIssueId: v.id("githubIssues"),
    tagIds: v.optional(v.array(v.id("tags"))),
    status: v.optional(
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

    const githubIssue = await ctx.db.get(args.githubIssueId);
    if (!githubIssue) {
      throw new Error("GitHub issue not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", githubIssue.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can import issues");
    }

    // Check if already imported
    if (githubIssue.refletFeedbackId) {
      throw new Error("This issue has already been imported");
    }

    const now = Date.now();

    // Determine status based on GitHub issue state
    let feedbackStatus = args.status ?? "open";
    if (githubIssue.state === "closed" && !args.status) {
      feedbackStatus = "closed";
    }

    // Create Reflet feedback
    const feedbackId = await ctx.db.insert("feedback", {
      organizationId: githubIssue.organizationId,
      title: githubIssue.title,
      description: githubIssue.body ?? "",
      status: feedbackStatus,
      authorId: user._id,
      voteCount: 0,
      commentCount: 0,
      isApproved: true, // Auto-approve imported issues
      isPinned: false,
      githubIssueId: githubIssue.githubIssueId,
      githubIssueNumber: githubIssue.githubIssueNumber,
      githubHtmlUrl: githubIssue.htmlUrl,
      syncedFromGithub: true,
      createdAt: now,
      updatedAt: now,
    });

    // Add tags if provided
    if (args.tagIds && args.tagIds.length > 0) {
      for (const tagId of args.tagIds) {
        await ctx.db.insert("feedbackTags", {
          feedbackId,
          tagId,
        });
      }
    }

    // Link the GitHub issue to the Reflet feedback
    await ctx.db.patch(args.githubIssueId, {
      refletFeedbackId: feedbackId,
    });

    return feedbackId;
  },
});

/**
 * Auto-import issues based on label mappings
 */
export const autoImportIssuesByLabel = mutation({
  args: {
    organizationId: v.id("organizations"),
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

    // Get all active label mappings
    const mappings = await ctx.db
      .query("githubLabelMappings")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    const activeMappings = mappings.filter((m) => m.autoSync);

    if (activeMappings.length === 0) {
      return { imported: 0 };
    }

    // Get all unimported issues
    const issues = await ctx.db
      .query("githubIssues")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();

    const unimportedIssues = issues.filter((i) => !i.refletFeedbackId);

    let importedCount = 0;
    const now = Date.now();

    for (const issue of unimportedIssues) {
      // Find matching mapping
      const matchingMapping = activeMappings.find((mapping) => {
        // Check if issue has the label
        const hasLabel = issue.githubLabels.some(
          (label) =>
            label.toLowerCase() === mapping.githubLabelName.toLowerCase()
        );

        if (!hasLabel) {
          return false;
        }

        // Check if we should sync closed issues
        if (issue.state === "closed" && !mapping.syncClosedIssues) {
          return false;
        }

        return true;
      });

      if (matchingMapping) {
        // Determine status
        let feedbackStatus = matchingMapping.defaultStatus ?? "open";
        if (issue.state === "closed" && !matchingMapping.defaultStatus) {
          feedbackStatus = "closed";
        }

        // Create Reflet feedback
        const feedbackId = await ctx.db.insert("feedback", {
          organizationId: args.organizationId,
          title: issue.title,
          description: issue.body ?? "",
          status: feedbackStatus,
          authorId: "system", // System-created
          voteCount: 0,
          commentCount: 0,
          isApproved: true,
          isPinned: false,
          githubIssueId: issue.githubIssueId,
          githubIssueNumber: issue.githubIssueNumber,
          githubHtmlUrl: issue.htmlUrl,
          syncedFromGithub: true,
          createdAt: now,
          updatedAt: now,
        });

        // Add tag if mapping has one
        if (matchingMapping.targetTagId) {
          await ctx.db.insert("feedbackTags", {
            feedbackId,
            tagId: matchingMapping.targetTagId,
          });
        }

        // Link the GitHub issue
        await ctx.db.patch(issue._id, {
          refletFeedbackId: feedbackId,
        });

        importedCount++;
      }
    }

    return { imported: importedCount };
  },
});
