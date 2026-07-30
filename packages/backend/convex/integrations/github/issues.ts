import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

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
          tagColor: tag?.color,
          tagName: tag?.name,
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
    limit: v.optional(v.number()),
    organizationId: v.id("organizations"),
    state: v.optional(v.union(v.literal("open"), v.literal("closed"))),
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

// ============================================
// MUTATIONS
// ============================================

/**
 * Create or update a label mapping
 */
export const upsertLabelMapping = mutation({
  args: {
    autoSync: v.boolean(),
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
    githubLabelColor: v.optional(v.string()),
    githubLabelName: v.string(),
    organizationId: v.id("organizations"),
    syncClosedIssues: v.optional(v.boolean()),
    targetTagId: v.optional(v.id("tags")),
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
        autoSync: args.autoSync,
        defaultStatus: args.defaultStatus,
        githubLabelColor: args.githubLabelColor,
        syncClosedIssues: args.syncClosedIssues,
        targetTagId: args.targetTagId,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new
    const mappingId = await ctx.db.insert("githubLabelMappings", {
      autoSync: args.autoSync,
      createdAt: now,
      defaultStatus: args.defaultStatus,
      githubConnectionId: connection._id,
      githubLabelColor: args.githubLabelColor,
      githubLabelName: args.githubLabelName,
      organizationId: args.organizationId,
      syncClosedIssues: args.syncClosedIssues,
      targetTagId: args.targetTagId,
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
    autoSync: v.optional(v.boolean()),
    enabled: v.boolean(),
    organizationId: v.id("organizations"),
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
      autoSyncIssues: args.autoSync ?? args.enabled,
      issuesSyncEnabled: args.enabled,
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
      lastIssuesSyncAt: Date.now(),
      lastIssuesSyncError: args.error,
      lastIssuesSyncStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Save synced GitHub issues
 */
export const saveSyncedIssues = mutation({
  args: {
    issues: v.array(
      v.object({
        body: v.optional(v.string()),
        githubAssignees: v.optional(v.array(v.string())),
        githubAuthor: v.optional(v.string()),
        githubAuthorAvatarUrl: v.optional(v.string()),
        githubClosedAt: v.optional(v.number()),
        githubCreatedAt: v.number(),
        githubIssueId: v.string(),
        githubIssueNumber: v.number(),
        githubLabels: v.array(v.string()),
        githubMilestone: v.optional(v.string()),
        githubUpdatedAt: v.number(),
        htmlUrl: v.string(),
        state: v.union(v.literal("open"), v.literal("closed")),
        title: v.string(),
      })
    ),
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
          body: issue.body,
          githubAssignees: issue.githubAssignees,
          githubAuthor: issue.githubAuthor,
          githubAuthorAvatarUrl: issue.githubAuthorAvatarUrl,
          githubClosedAt: issue.githubClosedAt,
          githubLabels: issue.githubLabels,
          githubMilestone: issue.githubMilestone,
          githubUpdatedAt: issue.githubUpdatedAt,
          htmlUrl: issue.htmlUrl,
          lastSyncedAt: now,
          state: issue.state,
          title: issue.title,
        });
      } else {
        // Insert new
        await ctx.db.insert("githubIssues", {
          body: issue.body,
          githubAssignees: issue.githubAssignees,
          githubAuthor: issue.githubAuthor,
          githubAuthorAvatarUrl: issue.githubAuthorAvatarUrl,
          githubClosedAt: issue.githubClosedAt,
          githubConnectionId: connection._id,
          githubCreatedAt: issue.githubCreatedAt,
          githubIssueId: issue.githubIssueId,
          githubIssueNumber: issue.githubIssueNumber,
          githubLabels: issue.githubLabels,
          githubMilestone: issue.githubMilestone,
          githubUpdatedAt: issue.githubUpdatedAt,
          htmlUrl: issue.htmlUrl,
          lastSyncedAt: now,
          organizationId: args.organizationId,
          state: issue.state,
          title: issue.title,
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
    tagIds: v.optional(v.array(v.id("tags"))),
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
      authorId: user._id,
      commentCount: 0,
      createdAt: now,
      description: githubIssue.body ?? "",
      githubHtmlUrl: githubIssue.htmlUrl,
      githubIssueId: githubIssue.githubIssueId,
      githubIssueNumber: githubIssue.githubIssueNumber,
      isApproved: true, // Auto-approve imported issues
      isPinned: false,
      organizationId: githubIssue.organizationId,
      status: feedbackStatus,
      syncedFromGithub: true,
      title: githubIssue.title,
      updatedAt: now,
      voteCount: 0,
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
          authorId: "system", // System-created
          commentCount: 0,
          createdAt: now,
          description: issue.body ?? "",
          githubHtmlUrl: issue.htmlUrl,
          githubIssueId: issue.githubIssueId,
          githubIssueNumber: issue.githubIssueNumber,
          isApproved: true,
          isPinned: false,
          organizationId: args.organizationId,
          status: feedbackStatus,
          syncedFromGithub: true,
          title: issue.title,
          updatedAt: now,
          voteCount: 0,
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
