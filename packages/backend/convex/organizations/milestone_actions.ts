import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuthUser } from "../shared/access";

export const remove = mutation({
  args: { id: v.id("milestones") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const milestone = await ctx.db.get(args.id);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", milestone.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete milestones");
    }

    // Delete all junction rows
    const junctions = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone", (q) => q.eq("milestoneId", args.id))
      .collect();

    for (const junction of junctions) {
      await ctx.db.delete(junction._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

export const addFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
    milestoneId: v.id("milestones"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", milestone.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can link feedback to milestones");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (feedback?.organizationId !== milestone.organizationId) {
      throw new Error("Feedback not found");
    }

    // Check for duplicates
    const existing = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone_feedback", (q) =>
        q.eq("milestoneId", args.milestoneId).eq("feedbackId", args.feedbackId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return ctx.db.insert("milestoneFeedback", {
      addedAt: Date.now(),
      addedBy: user._id,
      feedbackId: args.feedbackId,
      milestoneId: args.milestoneId,
    });
  },
});

export const removeFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
    milestoneId: v.id("milestones"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", milestone.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can unlink feedback from milestones");
    }

    const junction = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone_feedback", (q) =>
        q.eq("milestoneId", args.milestoneId).eq("feedbackId", args.feedbackId)
      )
      .unique();

    if (junction) {
      await ctx.db.delete(junction._id);
    }

    return true;
  },
});
