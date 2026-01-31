import { ShardedCounter } from "@convex-dev/sharded-counter";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const voteCounters = new ShardedCounter(components.shardedCounter, {
  defaultShards: 8,
});

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
    const count = await voteCounters.count(ctx, args.feedbackId);
    return Math.round(count);
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

    const voters = await Promise.all(
      votes.map(async (vote) => {
        const userData = vote.userId
          ? await authComponent.getAnyUserById(ctx, vote.userId)
          : null;
        return {
          id: vote._id,
          userId: vote.userId,
          voteType: vote.voteType,
          votedAt: vote.createdAt,
          user: userData
            ? {
                name: userData.name ?? null,
                email: userData.email ?? "",
                image: userData.image ?? null,
              }
            : null,
        };
      })
    );

    return voters;
  },
});

// ============================================
// MUTATIONS
// ============================================

const VOTE_MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const;

/**
 * Toggle vote on feedback (support upvote, downvote, and remove)
 */
export const toggle = mutation({
  args: {
    feedbackId: v.id("feedback"),
    voteType: v.union(v.literal("upvote"), v.literal("downvote")),
  },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Legacy code supporting both board and org access checks
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const feedback = await ctx.db.get(args.feedbackId);

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Get board if it exists (for backwards compatibility)
    const board = feedback.boardId ? await ctx.db.get(feedback.boardId) : null;
    const org = await ctx.db.get(feedback.organizationId);

    if (!org) {
      throw new Error("Organization not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    // Check visibility: member OR (board is public AND org is public) OR org is public (new flow)
    const isPublicAccess = board
      ? board.isPublic && org.isPublic
      : org.isPublic;
    const hasAccess = !!membership || isPublicAccess;
    if (!hasAccess) {
      throw new Error("You don't have access to vote on this feedback");
    }

    const existingVote = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    const counter = voteCounters.for(args.feedbackId);
    const isUpvote = args.voteType === "upvote";

    // Handle vote toggle logic
    if (existingVote) {
      const isSameVoteType = existingVote.voteType === args.voteType;
      if (isSameVoteType) {
        // Remove vote
        await ctx.db.delete(existingVote._id);
        await (isUpvote ? counter.dec(ctx) : counter.inc(ctx));
      } else {
        // Change vote type
        await ctx.db.patch(existingVote._id, { voteType: args.voteType });
        await (isUpvote ? counter.add(ctx, 2) : counter.subtract(ctx, 2));
      }
    } else {
      // Add new vote
      await ctx.db.insert("feedbackVotes", {
        feedbackId: args.feedbackId,
        userId: user._id,
        voteType: args.voteType,
        createdAt: Date.now(),
      });
      await (isUpvote ? counter.inc(ctx) : counter.dec(ctx));
    }

    const newVoteCount = await voteCounters.count(ctx, args.feedbackId);
    const roundedCount = Math.round(newVoteCount);

    // Check for milestone notification
    if (
      feedback.authorId &&
      VOTE_MILESTONES.includes(roundedCount as (typeof VOTE_MILESTONES)[number])
    ) {
      await ctx.db.insert("notifications", {
        userId: feedback.authorId,
        type: "vote_milestone",
        title: "Vote milestone reached!",
        message: `Your feedback "${feedback.title}" has reached ${roundedCount} votes!`,
        feedbackId: args.feedbackId,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { voted: true, voteCount: roundedCount };
  },
});
