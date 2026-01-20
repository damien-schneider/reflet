import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";
import { feedbackStatus } from "./feedback";

/**
 * List feedback for a board with filtering and sorting
 */
export const list = query({
  args: {
    boardId: v.id("boards"),
    status: v.optional(feedbackStatus),
    tagIds: v.optional(v.array(v.id("tags"))),
    search: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal("votes"),
        v.literal("newest"),
        v.literal("oldest"),
        v.literal("comments")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const boardDoc = await ctx.db.get(args.boardId);
    if (!boardDoc) {
      return [];
    }

    const user = await authComponent.safeGetAuthUser(ctx);
    const org = await ctx.db.get(boardDoc.organizationId);
    if (!org) {
      return [];
    }

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", boardDoc.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || (boardDoc.isPublic && org.isPublic))) {
      return [];
    }

    // Build query
    const feedbackQuery = ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId));

    let feedbackItems = await feedbackQuery.collect();

    // Filter by status
    if (args.status) {
      feedbackItems = feedbackItems.filter((f) => f.status === args.status);
    }

    // Filter non-approved for non-members
    if (!isMember) {
      feedbackItems = feedbackItems.filter((f) => f.isApproved);
    }

    // Filter by tags
    if (args.tagIds && args.tagIds.length > 0) {
      const selectedTagIds = args.tagIds;
      const feedbackWithTags = await Promise.all(
        feedbackItems.map(async (f) => {
          const tags = await ctx.db
            .query("feedbackTags")
            .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
            .collect();
          const tagIds = tags.map((t) => t.tagId);
          const hasAllTags = (selectedTagIds as string[]).every((tagId) =>
            (tagIds as string[]).includes(tagId)
          );
          return hasAllTags ? f : null;
        })
      );
      feedbackItems = feedbackWithTags.filter(Boolean) as typeof feedbackItems;
    }

    // Search filter (basic text search)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      feedbackItems = feedbackItems.filter(
        (f) =>
          f.title.toLowerCase().includes(searchLower) ||
          f.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    const sortBy = args.sortBy || "votes";
    switch (sortBy) {
      case "votes":
        feedbackItems.sort((a, b) => b.voteCount - a.voteCount);
        break;
      case "newest":
        feedbackItems.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        feedbackItems.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "comments":
        feedbackItems.sort((a, b) => b.commentCount - a.commentCount);
        break;
      default:
        break;
    }

    // Pinned items first
    feedbackItems.sort((a, b) => {
      if (a.isPinned && !b.isPinned) {
        return -1;
      }
      if (!a.isPinned && b.isPinned) {
        return 1;
      }
      return 0;
    });

    // Limit
    if (args.limit) {
      feedbackItems = feedbackItems.slice(0, args.limit);
    }

    // Add user vote status
    if (user) {
      const feedbackWithVoteStatus = await Promise.all(
        feedbackItems.map(async (f) => {
          const vote = await ctx.db
            .query("feedbackVotes")
            .withIndex("by_feedback_user", (q) =>
              q.eq("feedbackId", f._id).eq("userId", user._id)
            )
            .unique();
          return { ...f, hasVoted: !!vote };
        })
      );
      return feedbackWithVoteStatus;
    }

    return feedbackItems.map((f) => ({ ...f, hasVoted: false }));
  },
});

/**
 * List feedback for roadmap view (grouped by status)
 */
export const listForRoadmap = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return [];
    }

    const org = await ctx.db.get(board.organizationId);
    if (!org) {
      return [];
    }

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", board.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || (board.isPublic && org.isPublic))) {
      return [];
    }

    // Get all feedback for the board
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Filter to only approved items for non-members
    const filteredItems = isMember
      ? feedbackItems
      : feedbackItems.filter((f) => f.isApproved);

    // Add vote status and tags
    const feedbackWithDetails = await Promise.all(
      filteredItems.map(async (f) => {
        // Get tags
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
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
              q.eq("feedbackId", f._id).eq("userId", user._id)
            )
            .unique();
          hasVoted = !!vote;
        }

        return {
          ...f,
          tags: tags.filter(Boolean),
          hasVoted,
        };
      })
    );

    return feedbackWithDetails;
  },
});
