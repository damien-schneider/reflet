import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

/**
 * Publish a release
 */
export const publish = mutation({
  args: {
    id: v.id("releases"),
    feedbackStatus: v.optional(
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

    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can publish releases");
    }

    if (release.publishedAt) {
      throw new Error("Release is already published");
    }

    await ctx.db.patch(args.id, {
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update linked feedback status on publish
    if (args.feedbackStatus) {
      const links = await ctx.db
        .query("releaseFeedback")
        .withIndex("by_release", (q) => q.eq("releaseId", args.id))
        .collect();
      for (const link of links) {
        const feedback = await ctx.db.get(link.feedbackId);
        if (feedback && feedback.status !== args.feedbackStatus) {
          await ctx.db.patch(link.feedbackId, {
            status: args.feedbackStatus,
          });
        }
      }
    }

    // Schedule email notifications to subscribers
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.notifications.sendReleaseNotifications,
      {
        releaseId: args.id,
      }
    );

    // Schedule push to GitHub if enabled
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.node_actions.pushReleaseToGithub,
      {
        releaseId: args.id,
      }
    );

    // Schedule shipped notifications for linked feedback voters
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.shipped.sendShippedNotifications,
      {
        releaseId: args.id,
      }
    );

    return args.id;
  },
});

/**
 * Unpublish a release (return to draft)
 */
export const unpublish = mutation({
  args: { id: v.id("releases") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can unpublish releases");
    }

    await ctx.db.patch(args.id, {
      publishedAt: undefined,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Delete a release
 */
export const remove = mutation({
  args: { id: v.id("releases") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete releases");
    }

    // Delete all feedback links
    const links = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", args.id))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete associated commits
    const commitDocs = await ctx.db
      .query("releaseCommits")
      .withIndex("by_release", (q) => q.eq("releaseId", args.id))
      .collect();

    for (const doc of commitDocs) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(args.id);

    return true;
  },
});

/**
 * Push a single Reflet release to GitHub manually
 */
export const pushToGithub = mutation({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      throw new Error("Release not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can push releases to GitHub");
    }

    if (release.githubReleaseId) {
      throw new Error("Release is already linked to GitHub");
    }

    // Clear previous failed state before retrying
    if (release.githubPushStatus === "failed") {
      await ctx.db.patch(args.releaseId, {
        githubPushStatus: undefined,
        githubPushError: undefined,
        githubPushErrorType: undefined,
        updatedAt: Date.now(),
      });
    }

    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.node_actions.pushReleaseToGithub,
      { releaseId: args.releaseId, manual: true }
    );

    return { scheduled: true };
  },
});

/**
 * Trigger a full GitHub release sync (fetch all releases from GitHub)
 */
export const triggerGithubSync = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can trigger sync");
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

    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.sync.syncAllReleases,
      {
        organizationId: args.organizationId,
      }
    );

    return { scheduled: true };
  },
});
