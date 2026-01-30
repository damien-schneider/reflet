import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { MAX_COMMENT_LENGTH } from "./constants";
import { validateInputLength } from "./validators";

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
 * List comments for a feedback item
 */
export const list = query({
  args: {
    feedbackId: v.id("feedback"),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return [];
    }

    const board = await ctx.db.get(feedback.boardId);
    if (!board) {
      return [];
    }

    const org = await ctx.db.get(feedback.organizationId);
    if (!org) {
      return [];
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || (board.isPublic && org.isPublic))) {
      return [];
    }

    // Get all comments for this feedback
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    // Sort
    const sortBy = args.sortBy || "oldest";
    if (sortBy === "newest") {
      comments.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      comments.sort((a, b) => a.createdAt - b.createdAt);
    }

    // Build threaded structure
    const rootComments = comments.filter((c) => !c.parentId);
    const repliesMap = new Map<string, typeof comments>();

    for (const comment of comments) {
      if (comment.parentId) {
        const existing = repliesMap.get(comment.parentId) || [];
        existing.push(comment);
        repliesMap.set(comment.parentId, existing);
      }
    }

    // Add replies to each root comment and map authors
    const threaded = await Promise.all(
      rootComments.map(async (comment) => {
        const commentAuthor = comment.authorId
          ? await authComponent.getAnyUserById(ctx, comment.authorId)
          : null;
        const replies = await Promise.all(
          (repliesMap.get(comment._id) || []).map(async (reply) => {
            const replyAuthor = reply.authorId
              ? await authComponent.getAnyUserById(ctx, reply.authorId)
              : null;
            return {
              ...reply,
              author: replyAuthor
                ? {
                    name: replyAuthor.name || undefined,
                    email: replyAuthor.email,
                    image: replyAuthor.image || undefined,
                  }
                : undefined,
              isAuthor: user?._id === reply.authorId,
            };
          })
        );

        return {
          ...comment,
          author: commentAuthor
            ? {
                name: commentAuthor.name || undefined,
                email: commentAuthor.email,
                image: commentAuthor.image || undefined,
              }
            : undefined,
          replies,
          isAuthor: user?._id === comment.authorId,
        };
      })
    );

    return threaded;
  },
});

/**
 * Get a single comment
 */
export const get = query({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new comment
 */
export const create = mutation({
  args: {
    feedbackId: v.id("feedback"),
    body: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Validate input length
    validateInputLength(args.body, MAX_COMMENT_LENGTH, "Comment");

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

    // Check access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    const isMember = !!membership;

    if (!(isMember || (board.isPublic && org.isPublic))) {
      throw new Error("You don't have access to comment on this feedback");
    }

    // Validate parent comment if provided
    if (args.parentId) {
      const parentComment = await ctx.db.get(args.parentId);
      if (!parentComment || parentComment.feedbackId !== args.feedbackId) {
        throw new Error("Invalid parent comment");
      }
    }

    const now = Date.now();
    const commentId = await ctx.db.insert("comments", {
      feedbackId: args.feedbackId,
      authorId: user._id,
      body: args.body,
      isOfficial: false,
      parentId: args.parentId,
      createdAt: now,
      updatedAt: now,
    });

    // Update comment count
    await ctx.db.patch(args.feedbackId, {
      commentCount: feedback.commentCount + 1,
    });

    // Create notification for feedback author (if not commenting on own feedback)
    if (feedback.authorId && feedback.authorId !== user._id) {
      await ctx.db.insert("notifications", {
        userId: feedback.authorId,
        type: "new_comment",
        title: "New comment on your feedback",
        message: `Someone commented on "${feedback.title}"`,
        feedbackId: args.feedbackId,
        isRead: false,
        createdAt: now,
      });
    }

    return commentId;
  },
});

/**
 * Update a comment
 */
export const update = mutation({
  args: {
    id: v.id("comments"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Validate input length
    validateInputLength(args.body, MAX_COMMENT_LENGTH, "Comment");

    const comment = await ctx.db.get(args.id);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Only author can edit
    if (comment.authorId !== user._id) {
      throw new Error("You can only edit your own comments");
    }

    await ctx.db.patch(args.id, {
      body: args.body,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Mark comment as official (admin only)
 */
export const markOfficial = mutation({
  args: {
    id: v.id("comments"),
    isOfficial: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const comment = await ctx.db.get(args.id);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const feedback = await ctx.db.get(comment.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can mark comments as official");
    }

    await ctx.db.patch(args.id, {
      isOfficial: args.isOfficial,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Delete a comment
 */
export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const comment = await ctx.db.get(args.id);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const feedback = await ctx.db.get(comment.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    const isAdmin =
      membership?.role === "admin" || membership?.role === "owner";
    const isAuthor = comment.authorId === user._id;

    if (!(isAdmin || isAuthor)) {
      throw new Error("You don't have permission to delete this comment");
    }

    // Delete replies first
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();

    let deletedCount = 1; // The comment itself
    for (const reply of replies) {
      await ctx.db.delete(reply._id);
      deletedCount++;
    }

    // Delete the comment
    await ctx.db.delete(args.id);

    // Update comment count
    await ctx.db.patch(comment.feedbackId, {
      commentCount: Math.max(0, feedback.commentCount - deletedCount),
    });

    return true;
  },
});
