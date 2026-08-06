import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { requireOrgAdmin } from "../../shared/access";

export const toggleIssuesSync = mutation({
  args: {
    autoSync: v.optional(v.boolean()),
    enabled: v.boolean(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "configure issues sync");

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

export const updateIssuesSyncStatus = internalMutation({
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

export const saveSyncedIssues = internalMutation({
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
