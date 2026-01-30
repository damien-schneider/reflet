import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "./constants";
import { validateInputLength } from "./validators";

// ============================================
// TYPES
// ============================================

const feedbackStatus = v.union(
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
 * Get board configuration for the public API
 */
export const getBoardConfig = internalQuery({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return null;
    }

    const org = await ctx.db.get(board.organizationId);
    if (!org) {
      return null;
    }

    // Get board statuses
    const statuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    statuses.sort((a, b) => a.order - b.order);

    return {
      id: board._id,
      name: board.name,
      slug: board.slug,
      description: board.description,
      isPublic: board.isPublic,
      settings: board.settings,
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        primaryColor: org.primaryColor,
      },
      statuses: statuses.map((s) => ({
        id: s._id,
        name: s.name,
        color: s.color,
        icon: s.icon,
        order: s.order,
      })),
    };
  },
});

/**
 * List feedback for public API
 */
export const listFeedback = internalQuery({
  args: {
    boardId: v.id("boards"),
    statusId: v.optional(v.id("boardStatuses")),
    status: v.optional(feedbackStatus),
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
    offset: v.optional(v.number()),
    externalUserId: v.optional(v.id("externalUsers")),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return { items: [], total: 0, hasMore: false };
    }

    // Get all feedback for this board
    let feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Filter to approved only (public API always shows approved)
    feedbackItems = feedbackItems.filter((f) => f.isApproved);

    // Filter by status
    if (args.statusId) {
      feedbackItems = feedbackItems.filter((f) => f.statusId === args.statusId);
    }

    if (args.status) {
      feedbackItems = feedbackItems.filter((f) => f.status === args.status);
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
    const sortBy = args.sortBy ?? "votes";
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
        feedbackItems.sort((a, b) => b.voteCount - a.voteCount);
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

    const total = feedbackItems.length;

    // Pagination
    const offset = args.offset ?? 0;
    const limit = Math.min(args.limit ?? 50, 100);
    feedbackItems = feedbackItems.slice(offset, offset + limit);

    // Get board statuses for enrichment
    const boardStatuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    const statusMap = new Map(boardStatuses.map((s) => [s._id, s]));

    // Enrich with details
    const items = await Promise.all(
      feedbackItems.map(async (f) => {
        // Get tags
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const tags = await Promise.all(
          feedbackTags.map(async (ft) => {
            const tag = await ctx.db.get(ft.tagId);
            return tag
              ? { id: tag._id, name: tag.name, color: tag.color }
              : null;
          })
        );

        // Check if external user has voted
        let hasVoted = false;
        if (args.externalUserId) {
          const vote = await ctx.db
            .query("feedbackVotes")
            .withIndex("by_feedback_external_user", (q) =>
              q
                .eq("feedbackId", f._id)
                .eq("externalUserId", args.externalUserId)
            )
            .unique();
          hasVoted = !!vote;
        }

        // Get board status
        const boardStatus = f.statusId ? statusMap.get(f.statusId) : null;

        // Get author info (external user if available)
        let author: {
          name: string | undefined;
          email: string | undefined;
          avatar: string | undefined;
          isExternal: boolean;
        } | null = null;
        if (f.externalUserId) {
          const extUser = await ctx.db.get(f.externalUserId);
          if (extUser) {
            author = {
              name: extUser.name,
              email: extUser.email,
              avatar: extUser.avatar,
              isExternal: true,
            };
          }
        }

        return {
          id: f._id,
          title: f.title,
          description: f.description,
          status: f.status,
          voteCount: f.voteCount,
          commentCount: f.commentCount,
          isPinned: f.isPinned,
          hasVoted,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          completedAt: f.completedAt,
          tags: tags.filter(Boolean),
          boardStatus: boardStatus
            ? {
                id: boardStatus._id,
                name: boardStatus.name,
                color: boardStatus.color,
              }
            : null,
          author,
        };
      })
    );

    return {
      items,
      total,
      hasMore: offset + limit < total,
    };
  },
});

/**
 * Get single feedback item for public API
 */
export const getFeedback = internalQuery({
  args: {
    boardId: v.id("boards"),
    feedbackId: v.id("feedback"),
    externalUserId: v.optional(v.id("externalUsers")),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    // Verify board matches
    if (feedback.boardId !== args.boardId) {
      return null;
    }

    // Must be approved for public API
    if (!feedback.isApproved) {
      return null;
    }

    // Get board status
    let boardStatus: {
      id: Id<"boardStatuses">;
      name: string;
      color: string;
    } | null = null;
    if (feedback.statusId) {
      const status = await ctx.db.get(feedback.statusId);
      if (status) {
        boardStatus = {
          id: status._id,
          name: status.name,
          color: status.color,
        };
      }
    }

    // Get tags
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();
    const tags = await Promise.all(
      feedbackTags.map(async (ft) => {
        const tag = await ctx.db.get(ft.tagId);
        return tag ? { id: tag._id, name: tag.name, color: tag.color } : null;
      })
    );

    // Check if external user has voted
    let hasVoted = false;
    if (args.externalUserId) {
      const vote = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedback_external_user", (q) =>
          q
            .eq("feedbackId", args.feedbackId)
            .eq("externalUserId", args.externalUserId)
        )
        .unique();
      hasVoted = !!vote;
    }

    // Check if external user is subscribed
    let isSubscribed = false;
    if (args.externalUserId) {
      const subscription = await ctx.db
        .query("feedbackSubscriptions")
        .withIndex("by_feedback_external_user", (q) =>
          q
            .eq("feedbackId", args.feedbackId)
            .eq("externalUserId", args.externalUserId)
        )
        .unique();
      isSubscribed = !!subscription;
    }

    // Get author info
    let author: {
      name: string | undefined;
      email: string | undefined;
      avatar: string | undefined;
      isExternal: boolean;
    } | null = null;
    if (feedback.externalUserId) {
      const extUser = await ctx.db.get(feedback.externalUserId);
      if (extUser) {
        author = {
          name: extUser.name,
          email: extUser.email,
          avatar: extUser.avatar,
          isExternal: true,
        };
      }
    }

    return {
      id: feedback._id,
      title: feedback.title,
      description: feedback.description,
      status: feedback.status,
      voteCount: feedback.voteCount,
      commentCount: feedback.commentCount,
      isPinned: feedback.isPinned,
      hasVoted,
      isSubscribed,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
      completedAt: feedback.completedAt,
      tags: tags.filter(Boolean),
      boardStatus,
      author,
    };
  },
});

/**
 * List comments for feedback item
 */
export const listComments = internalQuery({
  args: {
    boardId: v.id("boards"),
    feedbackId: v.id("feedback"),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
  },
  handler: async (ctx, args) => {
    // Verify feedback exists and belongs to board
    const feedback = await ctx.db.get(args.feedbackId);
    if (
      !feedback ||
      feedback.boardId !== args.boardId ||
      !feedback.isApproved
    ) {
      return [];
    }

    // Get all comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    // Sort
    const sortBy = args.sortBy ?? "oldest";
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
        const existing = repliesMap.get(comment.parentId) ?? [];
        existing.push(comment);
        repliesMap.set(comment.parentId, existing);
      }
    }

    // Get author info for comments
    const getAuthorInfo = async (comment: (typeof comments)[0]) => {
      if (comment.externalUserId) {
        const extUser = await ctx.db.get(comment.externalUserId);
        if (extUser) {
          return {
            name: extUser.name,
            email: extUser.email,
            avatar: extUser.avatar,
            isExternal: true,
          };
        }
      }
      return null;
    };

    // Map comments with replies
    const result = await Promise.all(
      rootComments.map(async (comment) => {
        const author = await getAuthorInfo(comment);
        const replies = await Promise.all(
          (repliesMap.get(comment._id) ?? []).map(async (reply) => {
            const replyAuthor = await getAuthorInfo(reply);
            return {
              id: reply._id,
              body: reply.body,
              isOfficial: reply.isOfficial,
              author: replyAuthor,
              createdAt: reply.createdAt,
              updatedAt: reply.updatedAt,
            };
          })
        );

        return {
          id: comment._id,
          body: comment.body,
          isOfficial: comment.isOfficial,
          author,
          replies,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        };
      })
    );

    return result;
  },
});

/**
 * Get roadmap data for public API
 */
export const getRoadmap = internalQuery({
  args: {
    boardId: v.id("boards"),
    externalUserId: v.optional(v.id("externalUsers")),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return null;
    }

    const org = await ctx.db.get(board.organizationId);
    if (!org) {
      return null;
    }

    // Get roadmap lanes (tags marked as roadmap lanes)
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", board.organizationId)
      )
      .collect();

    const roadmapLanes = tags
      .filter((t) => t.isRoadmapLane)
      .sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0));

    // Get all approved feedback
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const approvedFeedback = feedbackItems.filter((f) => f.isApproved);

    // Group by roadmap lane
    const lanes = roadmapLanes.map((lane) => ({
      id: lane._id,
      name: lane.name,
      color: lane.color,
      items: approvedFeedback
        .filter((f) => f.roadmapLane === lane._id)
        .sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))
        .map((f) => ({
          id: f._id,
          title: f.title,
          status: f.status,
          voteCount: f.voteCount,
        })),
    }));

    // Add default lanes (now/next/later)
    const laneColors: Record<string, string> = {
      now: "#22c55e",
      next: "#3b82f6",
      later: "#6b7280",
    };
    const defaultLanes = ["now", "next", "later"].map((laneId) => ({
      id: laneId,
      name: laneId.charAt(0).toUpperCase() + laneId.slice(1),
      color: laneColors[laneId] ?? "#6b7280",
      items: approvedFeedback
        .filter((f) => f.roadmapLane === laneId)
        .sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))
        .map((f) => ({
          id: f._id,
          title: f.title,
          status: f.status,
          voteCount: f.voteCount,
        })),
    }));

    return {
      lanes: [...defaultLanes, ...lanes],
    };
  },
});

/**
 * Get changelog/releases for public API
 */
export const getChangelog = internalQuery({
  args: {
    boardId: v.id("boards"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return [];
    }

    // Get published releases
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", board.organizationId)
      )
      .collect();

    // Filter to published only and sort by date
    let publishedReleases = releases
      .filter((r) => r.publishedAt !== undefined && r.publishedAt !== null)
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

    // Apply limit
    const limit = args.limit ?? 20;
    publishedReleases = publishedReleases.slice(0, limit);

    // Get related feedback for each release
    const result = await Promise.all(
      publishedReleases.map(async (release) => {
        const releaseFeedback = await ctx.db
          .query("releaseFeedback")
          .withIndex("by_release", (q) => q.eq("releaseId", release._id))
          .collect();

        const feedbackItems = await Promise.all(
          releaseFeedback.map(async (rf) => {
            const f = await ctx.db.get(rf.feedbackId);
            return f ? { id: f._id, title: f.title } : null;
          })
        );

        return {
          id: release._id,
          title: release.title,
          description: release.description,
          version: release.version,
          publishedAt: release.publishedAt,
          feedback: feedbackItems.filter(Boolean),
        };
      })
    );

    return result;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create feedback via public API
 */
export const createFeedback = internalMutation({
  args: {
    boardId: v.id("boards"),
    title: v.string(),
    description: v.string(),
    externalUserId: v.id("externalUsers"),
  },
  handler: async (ctx, args) => {
    // Validate input
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

    // Get the default status
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
      status: board.settings?.defaultStatus ?? "open",
      statusId: defaultBoardStatus?._id,
      externalUserId: args.externalUserId,
      voteCount: 1, // Auto-vote for author
      commentCount: 0,
      isApproved: !board.settings?.requireApproval,
      isPinned: false,
      source: "api",
      createdAt: now,
      updatedAt: now,
    });

    // Auto-vote for the author
    await ctx.db.insert("feedbackVotes", {
      feedbackId,
      externalUserId: args.externalUserId,
      voteType: "upvote",
      createdAt: now,
    });

    // Auto-subscribe author to their feedback
    await ctx.db.insert("feedbackSubscriptions", {
      feedbackId,
      externalUserId: args.externalUserId,
      createdAt: now,
    });

    return { feedbackId, isApproved: !board.settings?.requireApproval };
  },
});

/**
 * Vote on feedback via public API
 */
export const voteFeedback = internalMutation({
  args: {
    boardId: v.id("boards"),
    feedbackId: v.id("feedback"),
    externalUserId: v.id("externalUsers"),
    voteType: v.optional(v.union(v.literal("upvote"), v.literal("downvote"))),
  },
  handler: async (ctx, args) => {
    const voteType = args.voteType ?? "upvote";

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.boardId !== args.boardId) {
      throw new Error("Feedback does not belong to this board");
    }

    // Check existing vote
    const existingVote = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback_external_user", (q) =>
        q
          .eq("feedbackId", args.feedbackId)
          .eq("externalUserId", args.externalUserId)
      )
      .unique();

    let newVoteCount = feedback.voteCount;
    let voted = false;

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Remove vote
        await ctx.db.delete(existingVote._id);
        newVoteCount =
          voteType === "upvote" ? newVoteCount - 1 : newVoteCount + 1;
      } else {
        // Change vote type
        await ctx.db.patch(existingVote._id, { voteType });
        newVoteCount =
          voteType === "upvote" ? newVoteCount + 2 : newVoteCount - 2;
        voted = true;
      }
    } else {
      // Add new vote
      await ctx.db.insert("feedbackVotes", {
        feedbackId: args.feedbackId,
        externalUserId: args.externalUserId,
        voteType,
        createdAt: Date.now(),
      });
      newVoteCount =
        voteType === "upvote" ? newVoteCount + 1 : newVoteCount - 1;
      voted = true;
    }

    // Update vote count
    await ctx.db.patch(args.feedbackId, { voteCount: newVoteCount });

    return { voted, voteCount: newVoteCount };
  },
});

/**
 * Add comment via public API
 */
export const addComment = internalMutation({
  args: {
    boardId: v.id("boards"),
    feedbackId: v.id("feedback"),
    body: v.string(),
    parentId: v.optional(v.id("comments")),
    externalUserId: v.id("externalUsers"),
  },
  handler: async (ctx, args) => {
    validateInputLength(args.body, MAX_COMMENT_LENGTH, "Comment");

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.boardId !== args.boardId) {
      throw new Error("Feedback does not belong to this board");
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
      externalUserId: args.externalUserId,
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

    return { commentId };
  },
});

/**
 * Subscribe to feedback updates via public API
 */
export const subscribeFeedback = internalMutation({
  args: {
    boardId: v.id("boards"),
    feedbackId: v.id("feedback"),
    externalUserId: v.id("externalUsers"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.boardId !== args.boardId) {
      throw new Error("Feedback does not belong to this board");
    }

    // Check existing subscription
    const existing = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_external_user", (q) =>
        q
          .eq("feedbackId", args.feedbackId)
          .eq("externalUserId", args.externalUserId)
      )
      .unique();

    if (existing) {
      return { subscribed: true, alreadySubscribed: true };
    }

    await ctx.db.insert("feedbackSubscriptions", {
      feedbackId: args.feedbackId,
      externalUserId: args.externalUserId,
      createdAt: Date.now(),
    });

    return { subscribed: true, alreadySubscribed: false };
  },
});

/**
 * Unsubscribe from feedback updates via public API
 */
export const unsubscribeFeedback = internalMutation({
  args: {
    boardId: v.id("boards"),
    feedbackId: v.id("feedback"),
    externalUserId: v.id("externalUsers"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.boardId !== args.boardId) {
      throw new Error("Feedback does not belong to this board");
    }

    // Find and delete subscription
    const existing = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_external_user", (q) =>
        q
          .eq("feedbackId", args.feedbackId)
          .eq("externalUserId", args.externalUserId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { unsubscribed: true };
    }

    return { unsubscribed: false, wasNotSubscribed: true };
  },
});

/**
 * Set importance vote via public API
 */
export const setImportance = internalMutation({
  args: {
    boardId: v.id("boards"),
    feedbackId: v.id("feedback"),
    importance: v.number(), // 1-4 scale
    externalUserId: v.id("externalUsers"),
  },
  handler: async (ctx, args) => {
    if (args.importance < 1 || args.importance > 4) {
      throw new Error("Importance must be between 1 and 4");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.boardId !== args.boardId) {
      throw new Error("Feedback does not belong to this board");
    }

    // Check existing importance vote using a manual query since we don't have an index for external users
    const existingVotes = await ctx.db
      .query("feedbackImportanceVotes")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    // Find vote by this external user using a workaround userId format
    const externalUserId = `external_${args.externalUserId}`;
    const existingVote = existingVotes.find((v) => v.userId === externalUserId);

    const now = Date.now();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        importance: args.importance,
        updatedAt: now,
      });
    } else {
      // Create new importance vote
      await ctx.db.insert("feedbackImportanceVotes", {
        feedbackId: args.feedbackId,
        userId: externalUserId,
        importance: args.importance,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, importance: args.importance };
  },
});
