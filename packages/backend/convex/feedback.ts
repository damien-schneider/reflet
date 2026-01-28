import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "./constants";
import { PLAN_LIMITS } from "./organizations";
import { getAuthUser } from "./utils";
import { validateInputLength } from "./validators";

// Feedback status type - matching schema
export const feedbackStatus = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("closed")
);

// ============================================
// QUERIES
// ============================================

/**
 * Get a single feedback item by ID
 */
export const get = query({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      return null;
    }

    const board = await ctx.db.get(feedback.boardId);
    if (!board) {
      return null;
    }

    const org = await ctx.db.get(feedback.organizationId);
    if (!org) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    // Check access
    let isMember = false;
    let role: string | null = null;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
      role = membership?.role ?? null;
    }

    if (!(isMember || (board.isPublic && org.isPublic))) {
      return null;
    }

    // Non-members can't see unapproved feedback
    if (!(isMember || feedback.isApproved)) {
      return null;
    }

    // Get tags
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.id))
      .collect();

    const tags = await Promise.all(
      feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
    );

    // Check if user voted
    let hasVoted = false;
    if (user) {
      const vote = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedback_user", (q) =>
          q.eq("feedbackId", args.id).eq("userId", user._id)
        )
        .unique();
      hasVoted = !!vote;
    }

    // Get author info from Better Auth
    let author: {
      name?: string;
      email?: string;
      image?: string | null;
    } | null = null;
    if (feedback.authorId) {
      const userData = await authComponent.getAnyUserById(
        ctx,
        feedback.authorId
      );
      if (userData) {
        author = {
          name: userData.name ?? null,
          email: userData.email ?? "",
          image: userData.image ?? null,
        };
      }
    }

    return {
      ...feedback,
      board,
      organization: org,
      tags: tags.filter(Boolean),
      hasVoted,
      isMember,
      role,
      isAuthor: user?._id === feedback.authorId,
      author,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create new feedback
 */
export const create = mutation({
  args: {
    boardId: v.id("boards"),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Validate input lengths
    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const org = await ctx.db.get(board.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check access - need to be member OR board is public
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    const isMember = !!membership;

    if (!(isMember || (board.isPublic && org.isPublic))) {
      throw new Error("You don't have access to this board");
    }

    // Check feedback limit
    const existingFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const limit = PLAN_LIMITS[org.subscriptionTier].maxFeedbackPerBoard;
    if (existingFeedback.length >= limit) {
      throw new Error(
        `Feedback limit reached. This board allows ${limit} feedback items.`
      );
    }

    // Get the default status (first status by order, usually "Open")
    const boardStatuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board_order", (q) => q.eq("boardId", args.boardId))
      .collect();
    const defaultBoardStatus = boardStatuses.sort(
      (a, b) => a.order - b.order
    )[0];

    const now = Date.now();
    const feedbackId = await ctx.db.insert("feedback", {
      boardId: args.boardId,
      organizationId: board.organizationId,
      title: args.title,
      description: args.description,
      status: board.settings?.defaultStatus || "open",
      statusId: defaultBoardStatus?._id,
      authorId: user._id,
      voteCount: 1, // Auto-vote for author
      commentCount: 0,
      isApproved: !board.settings?.requireApproval,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-vote for the author
    await ctx.db.insert("feedbackVotes", {
      feedbackId,
      userId: user._id,
      voteType: "upvote",
      createdAt: now,
    });

    return feedbackId;
  },
});

/**
 * Update feedback (author can update title/description, admin can update all)
 */
export const update = mutation({
  args: {
    id: v.id("feedback"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(feedbackStatus),
    isApproved: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    roadmapLane: v.optional(v.string()),
    roadmapOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Validate input lengths if present
    if (args.title !== undefined) {
      validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    }
    if (args.description !== undefined) {
      validateInputLength(
        args.description,
        MAX_DESCRIPTION_LENGTH,
        "Description"
      );
    }

    const feedback = await ctx.db.get(args.id);
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
    const isAuthor = feedback.authorId === user._id;

    if (!(isAdmin || isAuthor)) {
      throw new Error("You don't have permission to update this feedback");
    }

    // Authors can only update title and description
    if (isAdmin) {
      const { id, ...updates } = args;

      // If status changed to completed, set completedAt
      let completedAt = feedback.completedAt;
      if (args.status === "completed" && feedback.status !== "completed") {
        completedAt = Date.now();
      } else if (args.status && args.status !== "completed") {
        completedAt = undefined;
      }

      await ctx.db.patch(id, {
        ...updates,
        completedAt,
        updatedAt: Date.now(),
      });
    } else {
      const { id, title, description } = args;
      if (
        args.status !== undefined ||
        args.isApproved !== undefined ||
        args.isPinned !== undefined ||
        args.roadmapLane !== undefined ||
        args.roadmapOrder !== undefined
      ) {
        throw new Error("Only admins can update these fields");
      }
      await ctx.db.patch(id, { title, description, updatedAt: Date.now() });
    }

    return args.id;
  },
});
