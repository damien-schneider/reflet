import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

// Helper to sort feedback
const sortFeedback = <
  T extends {
    voteCount: number;
    createdAt: number;
    commentCount: number;
    isPinned: boolean;
  },
>(
  items: T[],
  sortBy: "votes" | "newest" | "oldest" | "comments"
): T[] => {
  const sorted = [...items];
  switch (sortBy) {
    case "votes":
      sorted.sort((a, b) => b.voteCount - a.voteCount);
      break;
    case "newest":
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "oldest":
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case "comments":
      sorted.sort((a, b) => b.commentCount - a.commentCount);
      break;
    default:
      break;
  }
  // Pinned items first
  sorted.sort((a, b) => {
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }
    return 0;
  });
  return sorted;
};

/**
 * List feedback for a board with filtering and sorting (legacy)
 */
export const list = query({
  args: {
    boardId: v.id("boards"),
    statusId: v.optional(v.id("boardStatuses")),
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

    // Get all board statuses for enrichment
    const boardStatuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    const statusMap = new Map(boardStatuses.map((s) => [s._id, s]));

    // Build query
    const feedbackQuery = ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId));

    let feedbackItems = await feedbackQuery.collect();

    // Filter by statusId
    if (args.statusId) {
      feedbackItems = feedbackItems.filter((f) => f.statusId === args.statusId);
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
    feedbackItems = sortFeedback(feedbackItems, args.sortBy ?? "votes");

    // Limit
    if (args.limit) {
      feedbackItems = feedbackItems.slice(0, args.limit);
    }

    // Enrich with board status info and user vote status
    const enrichFeedback = async (f: (typeof feedbackItems)[0]) => {
      // Get tags
      const feedbackTags = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
        .collect();
      const tags = await Promise.all(
        feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
      );

      // Get all votes for this feedback to calculate upvote/downvote counts
      const allVotes = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
        .collect();

      const upvoteCount = allVotes.filter(
        (v) => v.voteType === "upvote"
      ).length;
      const downvoteCount = allVotes.filter(
        (v) => v.voteType === "downvote"
      ).length;

      // Get user vote status
      let hasVoted = false;
      let userVoteType: "upvote" | "downvote" | null = null;
      if (user) {
        const userVote = allVotes.find((v) => v.userId === user._id);
        hasVoted = !!userVote;
        userVoteType = userVote?.voteType ?? null;
      }

      // Get board status info
      const boardStatus = f.statusId ? statusMap.get(f.statusId) : null;

      return {
        ...f,
        hasVoted,
        userVoteType,
        upvoteCount,
        downvoteCount,
        tags: tags.filter(Boolean),
        boardStatus: boardStatus
          ? { name: boardStatus.name, color: boardStatus.color }
          : null,
      };
    };

    return Promise.all(feedbackItems.map(enrichFeedback));
  },
});

/**
 * List feedback for an organization with filtering and sorting (new flow)
 */
export const listByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    statusId: v.optional(v.id("organizationStatuses")),
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
    const org = await ctx.db.get(args.organizationId);
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
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || org.isPublic)) {
      return [];
    }

    // Get all organization statuses for enrichment
    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const statusMap = new Map(orgStatuses.map((s) => [s._id, s]));

    // Get all feedback for the organization
    let feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by statusId
    if (args.statusId) {
      feedbackItems = feedbackItems.filter(
        (f) => f.organizationStatusId === args.statusId
      );
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

    // Search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      feedbackItems = feedbackItems.filter(
        (f) =>
          f.title.toLowerCase().includes(searchLower) ||
          f.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    feedbackItems = sortFeedback(feedbackItems, args.sortBy ?? "votes");

    // Limit
    if (args.limit) {
      feedbackItems = feedbackItems.slice(0, args.limit);
    }

    // Enrich with org status info and user vote status
    const enrichFeedback = async (f: (typeof feedbackItems)[0]) => {
      // Get tags
      const feedbackTags = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
        .collect();
      const tags = await Promise.all(
        feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
      );

      // Get all votes
      const allVotes = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
        .collect();

      const upvoteCount = allVotes.filter(
        (v) => v.voteType === "upvote"
      ).length;
      const downvoteCount = allVotes.filter(
        (v) => v.voteType === "downvote"
      ).length;

      // Get user vote status
      let hasVoted = false;
      let userVoteType: "upvote" | "downvote" | null = null;
      if (user) {
        const userVote = allVotes.find((v) => v.userId === user._id);
        hasVoted = !!userVote;
        userVoteType = userVote?.voteType ?? null;
      }

      // Get organization status info
      const orgStatus = f.organizationStatusId
        ? statusMap.get(f.organizationStatusId)
        : null;

      return {
        ...f,
        hasVoted,
        userVoteType,
        upvoteCount,
        downvoteCount,
        tags: tags.filter(Boolean),
        organizationStatus: orgStatus
          ? {
              name: orgStatus.name,
              color: orgStatus.color,
              icon: orgStatus.icon,
            }
          : null,
      };
    };

    return Promise.all(feedbackItems.map(enrichFeedback));
  },
});

/**
 * List feedback for roadmap view (grouped by status) - legacy board-based
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

        // Get all votes for this feedback
        const allVotes = await ctx.db
          .query("feedbackVotes")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();

        const upvoteCount = allVotes.filter(
          (v) => v.voteType === "upvote"
        ).length;
        const downvoteCount = allVotes.filter(
          (v) => v.voteType === "downvote"
        ).length;

        // Check if user voted
        let hasVoted = false;
        let userVoteType: "upvote" | "downvote" | null = null;
        if (user) {
          const userVote = allVotes.find((v) => v.userId === user._id);
          hasVoted = !!userVote;
          userVoteType = userVote?.voteType ?? null;
        }

        return {
          ...f,
          tags: tags.filter(Boolean),
          hasVoted,
          userVoteType,
          upvoteCount,
          downvoteCount,
        };
      })
    );

    return feedbackWithDetails;
  },
});

/**
 * List feedback for roadmap view - organization-based (new flow)
 */
export const listForRoadmapByOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || org.isPublic)) {
      return [];
    }

    // Get all feedback for the organization
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
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

        // Get organization status
        const orgStatus = f.organizationStatusId
          ? await ctx.db.get(f.organizationStatusId)
          : null;

        // Get all votes for this feedback
        const allVotes = await ctx.db
          .query("feedbackVotes")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();

        const upvoteCount = allVotes.filter(
          (v) => v.voteType === "upvote"
        ).length;
        const downvoteCount = allVotes.filter(
          (v) => v.voteType === "downvote"
        ).length;

        // Check if user voted
        let hasVoted = false;
        let userVoteType: "upvote" | "downvote" | null = null;
        if (user) {
          const userVote = allVotes.find((v) => v.userId === user._id);
          hasVoted = !!userVote;
          userVoteType = userVote?.voteType ?? null;
        }

        return {
          ...f,
          tags: tags.filter(Boolean),
          organizationStatus: orgStatus
            ? {
                name: orgStatus.name,
                color: orgStatus.color,
                icon: orgStatus.icon,
              }
            : null,
          hasVoted,
          userVoteType,
          upvoteCount,
          downvoteCount,
        };
      })
    );

    return feedbackWithDetails;
  },
});
