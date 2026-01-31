import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Importance levels: 1=Not important, 2=Nice to have, 3=Important, 4=Essential
const importanceValue = v.union(
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4)
);

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
 * Get the current user's importance vote for a feedback
 */
export const getUserVote = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const vote = await ctx.db
      .query("feedbackImportanceVotes")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    if (!vote) {
      return null;
    }

    return { importance: vote.importance };
  },
});

/**
 * Get importance vote statistics for a feedback
 */
export const getStats = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("feedbackImportanceVotes")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const stats = {
      totalVotes: votes.length,
      average: 0,
      distribution: {
        1: 0, // Not important
        2: 0, // Nice to have
        3: 0, // Important
        4: 0, // Essential
      },
    };

    if (votes.length > 0) {
      const sum = votes.reduce((acc, v) => acc + v.importance, 0);
      stats.average = sum / votes.length;

      for (const vote of votes) {
        const key = vote.importance as 1 | 2 | 3 | 4;
        stats.distribution[key]++;
      }
    }

    return stats;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Set or update importance vote for feedback
 */
export const vote = mutation({
  args: {
    feedbackId: v.id("feedback"),
    importance: importanceValue,
  },
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

    // Check access - member or public board
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    const isMember = !!membership;

    // Check visibility: member OR (board is public AND org is public) OR org is public (new flow)
    const isPublicAccess = board
      ? board.isPublic && org.isPublic
      : org.isPublic;

    if (!(isMember || isPublicAccess)) {
      throw new Error("You don't have access to vote on this feedback");
    }

    // Check if already voted
    const existingVote = await ctx.db
      .query("feedbackImportanceVotes")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    const now = Date.now();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        importance: args.importance,
        updatedAt: now,
      });
      return { updated: true, importance: args.importance };
    }

    // Create new vote
    await ctx.db.insert("feedbackImportanceVotes", {
      feedbackId: args.feedbackId,
      userId: user._id,
      importance: args.importance,
      createdAt: now,
      updatedAt: now,
    });

    return { updated: false, importance: args.importance };
  },
});

/**
 * Remove importance vote
 */
export const removeVote = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const existingVote = await ctx.db
      .query("feedbackImportanceVotes")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    if (existingVote) {
      await ctx.db.delete(existingVote._id);
      return { removed: true };
    }

    return { removed: false };
  },
});
