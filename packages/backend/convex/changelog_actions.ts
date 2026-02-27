import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getAuthUser } from "./utils";

/**
 * Link feedback to a release
 */
export const linkFeedback = mutation({
  args: {
    releaseId: v.id("releases"),
    feedbackId: v.id("feedback"),
    newStatus: v.optional(
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

    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      throw new Error("Release not found");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Ensure same organization
    if (feedback.organizationId !== release.organizationId) {
      throw new Error("Feedback and release must be in the same organization");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can link feedback to releases");
    }

    // Check if already linked
    const existing = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release_feedback", (q) =>
        q.eq("releaseId", args.releaseId).eq("feedbackId", args.feedbackId)
      )
      .unique();

    if (existing) {
      // Still update status if requested
      if (args.newStatus && feedback.status !== args.newStatus) {
        await ctx.db.patch(args.feedbackId, { status: args.newStatus });
      }
      return existing._id;
    }

    const linkId = await ctx.db.insert("releaseFeedback", {
      releaseId: args.releaseId,
      feedbackId: args.feedbackId,
      createdAt: Date.now(),
    });

    // Update feedback status if requested
    if (args.newStatus && feedback.status !== args.newStatus) {
      await ctx.db.patch(args.feedbackId, { status: args.newStatus });
    }

    return linkId;
  },
});

/**
 * Unlink feedback from a release
 */
export const unlinkFeedback = mutation({
  args: {
    releaseId: v.id("releases"),
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const release = await ctx.db.get(args.releaseId);
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
      throw new Error("Only admins can unlink feedback from releases");
    }

    const link = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release_feedback", (q) =>
        q.eq("releaseId", args.releaseId).eq("feedbackId", args.feedbackId)
      )
      .unique();

    if (link) {
      await ctx.db.delete(link._id);
    }

    return true;
  },
});

/**
 * Get completed feedback that can be added to releases
 */
export const getCompletedFeedback = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    // Get completed feedback
    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Get already linked feedback IDs
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const linkedFeedbackIds = new Set<string>();
    for (const release of releases) {
      const links = await ctx.db
        .query("releaseFeedback")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .collect();
      for (const link of links) {
        linkedFeedbackIds.add(link.feedbackId);
      }
    }

    // Filter out already linked feedback
    return feedback.filter((f) => !linkedFeedbackIds.has(f._id));
  },
});

/**
 * Get all feedback available for linking to releases (any status, not already linked)
 */
export const getAvailableFeedback = query({
  args: {
    organizationId: v.id("organizations"),
    excludeReleaseId: v.optional(v.id("releases")),
  },
  returns: v.array(
    v.object({
      _id: v.id("feedback"),
      title: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      voteCount: v.number(),
      tags: v.array(v.object({ _id: v.id("tags"), name: v.string() })),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Build set of feedback IDs linked to any release (except the excluded one)
    const linkedFeedbackIds = new Set<string>();
    const allLinks = await ctx.db.query("releaseFeedback").collect();

    for (const link of allLinks) {
      if (args.excludeReleaseId && link.releaseId === args.excludeReleaseId) {
        continue;
      }
      linkedFeedbackIds.add(link.feedbackId);
    }

    const availableFeedback = allFeedback.filter(
      (f) => !linkedFeedbackIds.has(f._id)
    );

    const result = await Promise.all(
      availableFeedback.map(async (f) => {
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const tags = (
          await Promise.all(feedbackTags.map((ft) => ctx.db.get(ft.tagId)))
        )
          .filter(
            (t): t is NonNullable<typeof t> => t !== null && t !== undefined
          )
          .map((t) => ({ _id: t._id, name: t.name }));

        return {
          _id: f._id,
          title: f.title,
          description: f.description,
          status: f.status,
          voteCount: f.voteCount ?? 0,
          tags,
        };
      })
    );

    return result;
  },
});

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
      internal.changelog_notifications.sendReleaseNotifications,
      {
        releaseId: args.id,
      }
    );

    // Schedule push to GitHub if enabled
    await ctx.scheduler.runAfter(
      0,
      internal.github_node_actions.pushReleaseToGithub,
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
      internal.github_node_actions.pushReleaseToGithub,
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

    await ctx.scheduler.runAfter(0, internal.github_sync.syncAllReleases, {
      organizationId: args.organizationId,
    });

    return { scheduled: true };
  },
});

// ============================================
// RELEASE COMMITS
// ============================================

const commitValidator = v.object({
  sha: v.string(),
  message: v.string(),
  fullMessage: v.string(),
  author: v.string(),
  date: v.string(),
});

const fileValidator = v.object({
  filename: v.string(),
  status: v.string(),
  additions: v.number(),
  deletions: v.number(),
});

/**
 * Save commits used for a release (upsert: replaces existing)
 */
export const saveReleaseCommits = mutation({
  args: {
    releaseId: v.id("releases"),
    commits: v.array(commitValidator),
    files: v.optional(v.array(fileValidator)),
    previousTag: v.optional(v.string()),
  },
  returns: v.id("releaseCommits"),
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
      throw new Error("Only admins can save release commits");
    }

    // Delete existing commits for this release
    const existing = await ctx.db
      .query("releaseCommits")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    return ctx.db.insert("releaseCommits", {
      releaseId: args.releaseId,
      commits: args.commits,
      files: args.files,
      previousTag: args.previousTag,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get commits associated with a release
 */
export const getReleaseCommits = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    return ctx.db
      .query("releaseCommits")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .first();
  },
});

/**
 * Get the latest commit SHA from the most recent published release that has stored commits.
 * Used as a fallback when the repo has no tags to determine the commit range.
 */
export const getLatestCommitFromPreviousRelease = query({
  args: {
    organizationId: v.id("organizations"),
    excludeReleaseId: v.optional(v.id("releases")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    // Get published releases ordered by publishedAt descending
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_published", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    // Find the most recent published release (with commits) that isn't the current one
    for (const release of releases) {
      if (!release.publishedAt) {
        continue;
      }
      if (args.excludeReleaseId && release._id === args.excludeReleaseId) {
        continue;
      }

      const commitDoc = await ctx.db
        .query("releaseCommits")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .first();

      if (commitDoc && commitDoc.commits.length > 0) {
        // Return the latest commit SHA (first commit is the most recent)
        return { sha: commitDoc.commits[0].sha };
      }
    }

    return null;
  },
});
