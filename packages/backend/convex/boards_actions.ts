import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./utils";

/**
 * Get board stats
 */
export const getStats = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return null;
    }

    // Count feedback by status
    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const statusCounts: Record<string, number> = {
      open: 0,
      under_review: 0,
      planned: 0,
      in_progress: 0,
      completed: 0,
      closed: 0,
    };

    for (const item of allFeedback) {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    }

    const totalVotes = allFeedback.reduce((sum, f) => sum + f.voteCount, 0);
    const totalComments = allFeedback.reduce(
      (sum, f) => sum + f.commentCount,
      0
    );

    return {
      feedbackCount: allFeedback.length,
      statusCounts,
      totalVotes,
      totalComments,
    };
  },
});

/**
 * Delete a board (admin/owner only)
 */
export const remove = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.id);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete boards");
    }

    // Delete all feedback and related data
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();

    for (const feedback of feedbackItems) {
      // Delete votes
      const votes = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const vote of votes) {
        await ctx.db.delete(vote._id);
      }

      // Delete comments
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }

      // Delete feedback tags
      const tags = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const tag of tags) {
        await ctx.db.delete(tag._id);
      }

      // Delete release feedback links
      const releaseLinks = await ctx.db
        .query("releaseFeedback")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const link of releaseLinks) {
        await ctx.db.delete(link._id);
      }

      await ctx.db.delete(feedback._id);
    }

    // Delete the board
    await ctx.db.delete(args.id);

    return true;
  },
});

/**
 * Toggle board public status
 */
export const togglePublic = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.id);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can change board visibility");
    }

    await ctx.db.patch(args.id, {
      isPublic: !board.isPublic,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
