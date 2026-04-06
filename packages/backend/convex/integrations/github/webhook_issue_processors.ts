import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";

/**
 * Internal mutation to handle auto-import of issue to feedback
 */
export const autoImportIssueToFeedback = internalMutation({
  args: {
    issueId: v.id("githubIssues"),
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    issue: v.object({
      id: v.string(),
      number: v.number(),
      title: v.string(),
      body: v.optional(v.string()),
      htmlUrl: v.string(),
      state: v.union(v.literal("open"), v.literal("closed")),
      labels: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const connection = await ctx.db.get(args.connectionId);

    if (!connection?.autoSyncIssues) {
      return;
    }

    const mappings = await ctx.db
      .query("githubLabelMappings")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", args.connectionId)
      )
      .collect();

    for (const mapping of mappings) {
      if (!mapping.autoSync) {
        continue;
      }

      const hasLabel = args.issue.labels.some(
        (label) => label.toLowerCase() === mapping.githubLabelName.toLowerCase()
      );

      if (!hasLabel) {
        continue;
      }

      if (args.issue.state === "closed" && !mapping.syncClosedIssues) {
        continue;
      }

      const feedbackStatus =
        args.issue.state === "closed" && !mapping.defaultStatus
          ? "closed"
          : (mapping.defaultStatus ?? "open");

      const feedbackId = await ctx.db.insert("feedback", {
        organizationId: args.organizationId,
        title: args.issue.title,
        description: args.issue.body ?? "",
        status: feedbackStatus,
        authorId: "system",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        githubIssueId: args.issue.id,
        githubIssueNumber: args.issue.number,
        githubHtmlUrl: args.issue.htmlUrl,
        syncedFromGithub: true,
        createdAt: now,
        updatedAt: now,
      });

      if (mapping.targetTagId) {
        await ctx.db.insert("feedbackTags", {
          feedbackId,
          tagId: mapping.targetTagId,
        });
      }

      await ctx.db.patch(args.issueId, {
        refletFeedbackId: feedbackId,
      });

      break;
    }
  },
});

/**
 * Internal mutation to process webhook issue event
 */
export const processIssueWebhook = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    issue: v.object({
      id: v.string(),
      number: v.number(),
      title: v.string(),
      body: v.optional(v.string()),
      htmlUrl: v.string(),
      state: v.union(v.literal("open"), v.literal("closed")),
      labels: v.array(v.string()),
      author: v.optional(v.string()),
      authorAvatarUrl: v.optional(v.string()),
      milestone: v.optional(v.string()),
      assignees: v.optional(v.array(v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
      closedAt: v.optional(v.number()),
    }),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const isDeleteAction =
      args.action === "deleted" || args.action === "transferred";

    const existing = await ctx.db
      .query("githubIssues")
      .withIndex("by_github_issue_id", (q) =>
        q
          .eq("githubConnectionId", args.connectionId)
          .eq("githubIssueId", args.issue.id)
      )
      .first();

    if (isDeleteAction) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return;
    }

    if (existing) {
      // Update existing issue
      await ctx.db.patch(existing._id, {
        title: args.issue.title,
        body: args.issue.body,
        htmlUrl: args.issue.htmlUrl,
        state: args.issue.state,
        githubLabels: args.issue.labels,
        githubAuthor: args.issue.author,
        githubAuthorAvatarUrl: args.issue.authorAvatarUrl,
        githubMilestone: args.issue.milestone,
        githubAssignees: args.issue.assignees,
        githubUpdatedAt: args.issue.updatedAt,
        githubClosedAt: args.issue.closedAt,
        lastSyncedAt: now,
      });

      // Update linked feedback if exists
      if (existing.refletFeedbackId) {
        const feedback = await ctx.db.get(existing.refletFeedbackId);
        if (feedback) {
          const newStatus =
            args.issue.state === "closed" ? "closed" : feedback.status;
          await ctx.db.patch(existing.refletFeedbackId, {
            title: args.issue.title,
            description: args.issue.body ?? "",
            status: newStatus,
            updatedAt: now,
          });
        }
      }
    } else {
      // Insert new issue
      const issueId = await ctx.db.insert("githubIssues", {
        organizationId: args.organizationId,
        githubConnectionId: args.connectionId,
        githubIssueId: args.issue.id,
        githubIssueNumber: args.issue.number,
        title: args.issue.title,
        body: args.issue.body,
        htmlUrl: args.issue.htmlUrl,
        state: args.issue.state,
        githubLabels: args.issue.labels,
        githubAuthor: args.issue.author,
        githubAuthorAvatarUrl: args.issue.authorAvatarUrl,
        githubMilestone: args.issue.milestone,
        githubAssignees: args.issue.assignees,
        githubCreatedAt: args.issue.createdAt,
        githubUpdatedAt: args.issue.updatedAt,
        githubClosedAt: args.issue.closedAt,
        lastSyncedAt: now,
      });

      // Schedule auto-import check via separate mutation
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.github.webhook_issue_processors
          .autoImportIssueToFeedback,
        {
          issueId,
          connectionId: args.connectionId,
          organizationId: args.organizationId,
          issue: {
            id: args.issue.id,
            number: args.issue.number,
            title: args.issue.title,
            body: args.issue.body,
            htmlUrl: args.issue.htmlUrl,
            state: args.issue.state,
            labels: args.issue.labels,
          },
        }
      );
    }

    await ctx.db.patch(args.connectionId, {
      lastIssuesSyncAt: now,
      lastIssuesSyncStatus: "success",
      updatedAt: now,
    });
  },
});
