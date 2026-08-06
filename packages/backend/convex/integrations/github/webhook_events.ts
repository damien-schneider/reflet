import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";

export const processReleaseWebhook = internalMutation({
  args: {
    action: v.string(),
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    release: v.object({
      body: v.optional(v.string()),
      createdAt: v.number(),
      htmlUrl: v.string(),
      id: v.string(),
      isDraft: v.boolean(),
      isPrerelease: v.boolean(),
      name: v.optional(v.string()),
      publishedAt: v.optional(v.number()),
      tagName: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.action === "deleted") {
      // Find and delete the synced release
      const existing = await ctx.db
        .query("githubReleases")
        .withIndex("by_github_release_id", (q) =>
          q
            .eq("githubConnectionId", args.connectionId)
            .eq("githubReleaseId", args.release.id)
        )
        .first();

      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return;
    }

    // Check if release already exists
    const existing = await ctx.db
      .query("githubReleases")
      .withIndex("by_github_release_id", (q) =>
        q
          .eq("githubConnectionId", args.connectionId)
          .eq("githubReleaseId", args.release.id)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        body: args.release.body,
        htmlUrl: args.release.htmlUrl,
        isDraft: args.release.isDraft,
        isPrerelease: args.release.isPrerelease,
        lastSyncedAt: now,
        name: args.release.name,
        publishedAt: args.release.publishedAt,
        tagName: args.release.tagName,
      });
    } else {
      // Insert new
      await ctx.db.insert("githubReleases", {
        body: args.release.body,
        createdAt: args.release.createdAt,
        githubConnectionId: args.connectionId,
        githubReleaseId: args.release.id,
        htmlUrl: args.release.htmlUrl,
        isDraft: args.release.isDraft,
        isPrerelease: args.release.isPrerelease,
        lastSyncedAt: now,
        name: args.release.name,
        organizationId: args.organizationId,
        publishedAt: args.release.publishedAt,
        tagName: args.release.tagName,
      });
    }

    // Update connection sync status
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: now,
      lastSyncStatus: "success",
      updatedAt: now,
    });

    // Check if auto-import is enabled
    const connection = await ctx.db.get(args.connectionId);
    if (connection?.autoSyncReleases && args.action === "published") {
      // Auto-create Reflet release
      const existingRefletRelease = await ctx.db
        .query("releases")
        .withIndex("by_github_release", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("githubReleaseId", args.release.id)
        )
        .first();

      if (!existingRefletRelease) {
        await ctx.db.insert("releases", {
          createdAt: now,
          description: args.release.body,
          githubHtmlUrl: args.release.htmlUrl,
          githubReleaseId: args.release.id,
          organizationId: args.organizationId,
          publishedAt: now,
          syncedFromGithub: true,
          title: args.release.name || args.release.tagName,
          updatedAt: now,
          version: args.release.tagName,
        });
      }
    }
  },
});

export const processIssueWebhook = internalMutation({
  args: {
    action: v.string(),
    connectionId: v.id("githubConnections"),
    issue: v.object({
      assignees: v.optional(v.array(v.string())),
      author: v.optional(v.string()),
      authorAvatarUrl: v.optional(v.string()),
      body: v.optional(v.string()),
      closedAt: v.optional(v.number()),
      createdAt: v.number(),
      htmlUrl: v.string(),
      id: v.string(),
      labels: v.array(v.string()),
      milestone: v.optional(v.string()),
      number: v.number(),
      state: v.union(v.literal("open"), v.literal("closed")),
      title: v.string(),
      updatedAt: v.number(),
    }),
    organizationId: v.id("organizations"),
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
        body: args.issue.body,
        githubAssignees: args.issue.assignees,
        githubAuthor: args.issue.author,
        githubAuthorAvatarUrl: args.issue.authorAvatarUrl,
        githubClosedAt: args.issue.closedAt,
        githubLabels: args.issue.labels,
        githubMilestone: args.issue.milestone,
        githubUpdatedAt: args.issue.updatedAt,
        htmlUrl: args.issue.htmlUrl,
        lastSyncedAt: now,
        state: args.issue.state,
        title: args.issue.title,
      });

      // Update linked feedback if exists
      if (existing.refletFeedbackId) {
        const feedback = await ctx.db.get(existing.refletFeedbackId);
        if (feedback) {
          const newStatus =
            args.issue.state === "closed" ? "closed" : feedback.status;
          await ctx.db.patch(existing.refletFeedbackId, {
            description: args.issue.body ?? "",
            status: newStatus,
            title: args.issue.title,
            updatedAt: now,
          });
        }
      }
    } else {
      // Insert new issue
      const issueId = await ctx.db.insert("githubIssues", {
        body: args.issue.body,
        githubAssignees: args.issue.assignees,
        githubAuthor: args.issue.author,
        githubAuthorAvatarUrl: args.issue.authorAvatarUrl,
        githubClosedAt: args.issue.closedAt,
        githubConnectionId: args.connectionId,
        githubCreatedAt: args.issue.createdAt,
        githubIssueId: args.issue.id,
        githubIssueNumber: args.issue.number,
        githubLabels: args.issue.labels,
        githubMilestone: args.issue.milestone,
        githubUpdatedAt: args.issue.updatedAt,
        htmlUrl: args.issue.htmlUrl,
        lastSyncedAt: now,
        organizationId: args.organizationId,
        state: args.issue.state,
        title: args.issue.title,
      });

      // Schedule auto-import check via separate mutation
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.github.issue_actions.autoImportIssueToFeedback,
        {
          connectionId: args.connectionId,
          issue: {
            body: args.issue.body,
            htmlUrl: args.issue.htmlUrl,
            id: args.issue.id,
            labels: args.issue.labels,
            number: args.issue.number,
            state: args.issue.state,
            title: args.issue.title,
          },
          issueId,
          organizationId: args.organizationId,
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

// Regex to match feedback references in PR title/body
const FEEDBACK_REF_REGEX = /(?:fixes|closes|resolves)\s+reflet:([a-z0-9]+)/gi;

/**
 * Process a merged pull request webhook.
 * Looks for feedback references like "fixes reflet:{feedbackId}" in PR title/body
 * and updates the referenced feedback status to "completed".
 */
export const processPullRequestWebhook = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    pullRequest: v.object({
      authorLogin: v.optional(v.string()),
      baseRef: v.string(),
      body: v.optional(v.string()),
      headRef: v.string(),
      htmlUrl: v.string(),
      id: v.string(),
      mergedAt: v.optional(v.number()),
      number: v.number(),
      title: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const { pullRequest } = args;
    const now = Date.now();

    // Combine title and body to search for references
    const searchText = [pullRequest.title, pullRequest.body ?? ""].join("\n");

    // Find all feedback references
    const feedbackIds: string[] = [];
    let match: RegExpExecArray | null = null;

    // Reset regex state
    FEEDBACK_REF_REGEX.lastIndex = 0;
    match = FEEDBACK_REF_REGEX.exec(searchText);
    while (match !== null) {
      feedbackIds.push(match[1]);
      match = FEEDBACK_REF_REGEX.exec(searchText);
    }

    if (feedbackIds.length === 0) {
      return { processed: 0 };
    }

    let processed = 0;

    for (const feedbackId of feedbackIds) {
      try {
        const feedback = await ctx.db.get(feedbackId as Id<"feedback">);

        if (!feedback) {
          continue;
        }

        // Verify feedback belongs to the same organization
        if (feedback.organizationId !== args.organizationId) {
          continue;
        }

        // Only update if not already completed
        if (feedback.status === "completed") {
          continue;
        }

        await ctx.db.patch(feedback._id, {
          status: "completed",
          updatedAt: now,
        });

        // Create activity log
        await ctx.db.insert("activityLogs", {
          action: "status_changed",
          authorId: "system",
          createdAt: now,
          details: JSON.stringify({
            newStatus: "completed",
            oldStatus: feedback.status,
            prNumber: pullRequest.number,
            prUrl: pullRequest.htmlUrl,
            source: "github_pr",
          }),
          feedbackId: feedback._id,
          organizationId: args.organizationId,
        });

        processed++;
      } catch {
        // Skip individual processing failures
      }
    }

    return { processed };
  },
});
