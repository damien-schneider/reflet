import { ShardedCounter } from "@convex-dev/sharded-counter";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireAuthUser } from "../shared/access";
import { rateLimiter } from "../shared/rate_limits";
import { canViewFeedback } from "./public_projection";

const voteCounters = new ShardedCounter(components.shardedCounter, {
  defaultShards: 8,
});

const VOTE_MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const;

/**
 * Toggle vote on feedback (support upvote, downvote, and remove)
 */
export const toggle = mutation({
  args: {
    feedbackId: v.id("feedback"),
    voteType: v.union(v.literal("upvote"), v.literal("downvote")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const feedback = await ctx.db.get(args.feedbackId);

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (!(await canViewFeedback(ctx, feedback))) {
      throw new Error("You don't have access to vote on this feedback");
    }
    await rateLimiter.limit(ctx, "feedbackInteractionPerUser", {
      key: user._id,
      throws: true,
    });

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
        createdAt: Date.now(),
        feedbackId: args.feedbackId,
        userId: user._id,
        voteType: args.voteType,
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
        createdAt: Date.now(),
        feedbackId: args.feedbackId,
        isRead: false,
        message: `Your feedback "${feedback.title}" has reached ${roundedCount} votes!`,
        title: "Vote milestone reached!",
        type: "vote_milestone",
        userId: feedback.authorId,
      });

      // Trigger push notification
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.push.sendPushNotification,
        {
          message: `Your feedback "${feedback.title}" has reached ${roundedCount} votes!`,
          title: "Vote milestone reached!",
          type: "vote_milestone",
          url: "/dashboard",
          userId: feedback.authorId,
        }
      );
    }

    return { voteCount: roundedCount, voted: true };
  },
});
