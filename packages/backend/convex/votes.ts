import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Helper to get authenticated user
const getAuthUser = async (ctx: { auth: unknown }) => {
  const user = await authComponent.safeGetAuthUser(
    ctx as Parameters<typeof authComponent.safeGetAuthUser>[0]
  );
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

// ============================================
// QUERIES
// ============================================

/**
 * Check if current user has voted on a feedback
 */
export const hasVoted = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return false;
    }

    const vote = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    return !!vote;
  },
});

/**
 * Get vote count for feedback
 */
export const getCount = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    return feedback?.voteCount ?? 0;
  },
});

/**
 * Get voters for a feedback (admin only)
 */
export const getVoters = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return [];
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    const votes = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    return votes;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Toggle vote on feedback
 */
export const toggle = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const board = await ctx.db.get(feedback.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const org = await ctx.db.get(feedback.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check access - member or public board
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    const isMember = !!membership;

    if (!(isMember || (board.isPublic && org.isPublic))) {
      throw new Error("You don't have access to vote on this feedback");
    }

    // Check if already voted
    const existingVote = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    if (existingVote) {
      // Remove vote
      await ctx.db.delete(existingVote._id);
      await ctx.db.patch(args.feedbackId, {
        voteCount: Math.max(0, feedback.voteCount - 1),
      });
      return { voted: false, voteCount: Math.max(0, feedback.voteCount - 1) };
    }
    // Add vote
    await ctx.db.insert("feedbackVotes", {
      feedbackId: args.feedbackId,
      userId: user._id,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.feedbackId, {
      voteCount: feedback.voteCount + 1,
    });

    // Check for vote milestones and create notifications
    const newVoteCount = feedback.voteCount + 1;
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    if (milestones.includes(newVoteCount)) {
      await ctx.db.insert("notifications", {
        userId: feedback.authorId,
        type: "vote_milestone",
        title: "Vote milestone reached!",
        message: `Your feedback "${feedback.title}" has reached ${newVoteCount} votes!`,
        feedbackId: args.feedbackId,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { voted: true, voteCount: newVoteCount };
  },
});
