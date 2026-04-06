import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getAuthUser } from "../shared/utils";

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
