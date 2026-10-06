import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { requireAuthUser } from "../shared/access";
import { applyReleaseStatus } from "./feedback_status";

export const linkFeedback = mutation({
  args: {
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
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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
      await applyReleaseStatus(ctx, feedback, args.newStatus, user._id);
      return existing._id;
    }

    const linkId = await ctx.db.insert("releaseFeedback", {
      createdAt: Date.now(),
      feedbackId: args.feedbackId,
      releaseId: args.releaseId,
    });

    await applyReleaseStatus(ctx, feedback, args.newStatus, user._id);

    return linkId;
  },
});

export const unlinkFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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

export const getAvailableFeedback = query({
  args: {
    excludeReleaseId: v.optional(v.id("releases")),
    organizationId: v.id("organizations"),
  },
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

    const isLinkedElsewhere = async (feedbackId: Id<"feedback">) => {
      const links = await ctx.db
        .query("releaseFeedback")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
        .collect();
      return links.some((link) => link.releaseId !== args.excludeReleaseId);
    };
    const linkedElsewhere = await Promise.all(
      allFeedback.map((f) => isLinkedElsewhere(f._id))
    );
    const availableFeedback = allFeedback.filter(
      (_, index) => !linkedElsewhere[index]
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
          description: f.description,
          status: f.status,
          tags,
          title: f.title,
          voteCount: f.voteCount ?? 0,
        };
      })
    );

    return result;
  },
  returns: v.array(
    v.object({
      _id: v.id("feedback"),
      description: v.optional(v.string()),
      status: v.string(),
      tags: v.array(v.object({ _id: v.id("tags"), name: v.string() })),
      title: v.string(),
      voteCount: v.number(),
    })
  ),
});
