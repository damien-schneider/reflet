import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";

/**
 * Internal mutation to process webhook release event
 */
export const processReleaseWebhook = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    release: v.object({
      id: v.string(),
      tagName: v.string(),
      name: v.optional(v.string()),
      body: v.optional(v.string()),
      htmlUrl: v.string(),
      isDraft: v.boolean(),
      isPrerelease: v.boolean(),
      publishedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    action: v.string(),
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
        tagName: args.release.tagName,
        name: args.release.name,
        body: args.release.body,
        htmlUrl: args.release.htmlUrl,
        isDraft: args.release.isDraft,
        isPrerelease: args.release.isPrerelease,
        publishedAt: args.release.publishedAt,
        lastSyncedAt: now,
      });
    } else {
      // Insert new
      await ctx.db.insert("githubReleases", {
        organizationId: args.organizationId,
        githubConnectionId: args.connectionId,
        githubReleaseId: args.release.id,
        tagName: args.release.tagName,
        name: args.release.name,
        body: args.release.body,
        htmlUrl: args.release.htmlUrl,
        isDraft: args.release.isDraft,
        isPrerelease: args.release.isPrerelease,
        publishedAt: args.release.publishedAt,
        createdAt: args.release.createdAt,
        lastSyncedAt: now,
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
          organizationId: args.organizationId,
          title: args.release.name || args.release.tagName,
          description: args.release.body,
          version: args.release.tagName,
          publishedAt: now,
          githubReleaseId: args.release.id,
          githubHtmlUrl: args.release.htmlUrl,
          syncedFromGithub: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
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
      id: v.string(),
      number: v.number(),
      title: v.string(),
      body: v.optional(v.string()),
      htmlUrl: v.string(),
      mergedAt: v.optional(v.number()),
      headRef: v.string(),
      baseRef: v.string(),
      authorLogin: v.optional(v.string()),
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
          feedbackId: feedback._id,
          organizationId: args.organizationId,
          authorId: "system",
          action: "status_changed",
          details: JSON.stringify({
            oldStatus: feedback.status,
            newStatus: "completed",
            source: "github_pr",
            prNumber: pullRequest.number,
            prUrl: pullRequest.htmlUrl,
          }),
          createdAt: now,
        });

        processed++;
      } catch {
        // Skip individual processing failures
      }
    }

    return { processed };
  },
});
