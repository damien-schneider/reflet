import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./utils";

// Default statuses to create for new boards
const DEFAULT_STATUSES = [
  { name: "Open", color: "#6b7280", icon: "circle", order: 0 },
  { name: "Under Review", color: "#f59e0b", icon: "eye", order: 1 },
  { name: "Planned", color: "#3b82f6", icon: "calendar", order: 2 },
  { name: "In Progress", color: "#8b5cf6", icon: "loader", order: 3 },
  { name: "Completed", color: "#22c55e", icon: "check-circle", order: 4 },
  { name: "Closed", color: "#ef4444", icon: "x-circle", order: 5 },
] as const;

/**
 * Create a new board (admin/owner only)
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can create boards");
    }

    // Generate slug from name
    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for duplicate slug
    const existingBoard = await ctx.db
      .query("boards")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("slug"), slug))
      .first();

    const finalSlug = existingBoard ? `${slug}-${Date.now()}` : slug;

    const now = Date.now();
    const boardId = await ctx.db.insert("boards", {
      organizationId: args.organizationId,
      name: args.name,
      slug: finalSlug,
      description: args.description,
      isPublic: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create default statuses for the board
    for (const status of DEFAULT_STATUSES) {
      await ctx.db.insert("boardStatuses", {
        boardId,
        name: status.name,
        color: status.color,
        icon: status.icon,
        order: status.order,
        createdAt: now,
        updatedAt: now,
      });
    }

    return boardId;
  },
});

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
