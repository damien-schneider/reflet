import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

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
