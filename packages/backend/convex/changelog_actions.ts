import { v } from "convex/values";
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
      return existing._id;
    }

    const linkId = await ctx.db.insert("releaseFeedback", {
      releaseId: args.releaseId,
      feedbackId: args.feedbackId,
      createdAt: Date.now(),
    });

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
 * Publish a release
 */
export const publish = mutation({
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
      throw new Error("Only admins can publish releases");
    }

    if (release.publishedAt) {
      throw new Error("Release is already published");
    }

    await ctx.db.patch(args.id, {
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });

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

    // Delete all links
    const links = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", args.id))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.id);

    return true;
  },
});
