import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "./constants";
import { PLAN_LIMITS } from "./organizations";
import { getAuthUser } from "./utils";

/**
 * List public feedback for a board (no auth required)
 */
export const listPublic = query({
  args: {
    boardId: v.id("boards"),
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
    const board = await ctx.db.get(args.boardId);
    if (!board?.isPublic) {
      return [];
    }

    const org = await ctx.db.get(board.organizationId);
    if (!org) {
      return [];
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    // Get approved feedback only
    let feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    feedbackItems = feedbackItems.filter((f) => f.isApproved);

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

    // Add tags and vote status
    const feedbackWithDetails = await Promise.all(
      feedbackItems.map(async (f) => {
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
          boardId: f.boardId,
        };
      })
    );

    return feedbackWithDetails;
  },
});

/**
 * Create public feedback (anonymous)
 */
export const createPublic = mutation({
  args: {
    boardId: v.id("boards"),
    title: v.string(),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board?.isPublic) {
      throw new Error("Board not found or not public");
    }

    const org = await ctx.db.get(board.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    if (args.title.length > MAX_TITLE_LENGTH) {
      throw new Error(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
    }
    if (
      args.description !== undefined &&
      args.description.length > MAX_DESCRIPTION_LENGTH
    ) {
      throw new Error(
        `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`
      );
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

    const user = await authComponent.safeGetAuthUser(ctx);
    const now = Date.now();

    // Get the default status (first status by order, usually "Open")
    const boardStatuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board_order", (q) => q.eq("boardId", args.boardId))
      .collect();
    const defaultBoardStatus = boardStatuses.sort(
      (a, b) => a.order - b.order
    )[0];

    const feedbackId = await ctx.db.insert("feedback", {
      boardId: args.boardId,
      organizationId: board.organizationId,
      title: args.title,
      description: args.description || "",
      status: board.settings?.defaultStatus || "open",
      statusId: defaultBoardStatus?._id,
      authorId: user?._id || `anonymous:${args.email || "unknown"}`,
      voteCount: 0,
      commentCount: 0,
      isApproved: !board.settings?.requireApproval,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    });

    return feedbackId;
  },
});

/**
 * Toggle pin status on feedback
 */
export const togglePin = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.id);
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
      throw new Error("Only admins can pin/unpin feedback");
    }

    await ctx.db.patch(args.id, {
      isPinned: !feedback.isPinned,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Add a tag to feedback
 */
export const addTag = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.organizationId !== feedback.organizationId) {
      throw new Error("Tag not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can manage tags");
    }

    // Check if already tagged
    const existing = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback_tag", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("tagId", args.tagId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const linkId = await ctx.db.insert("feedbackTags", {
      feedbackId: args.feedbackId,
      tagId: args.tagId,
    });

    return linkId;
  },
});

/**
 * Remove a tag from feedback
 */
export const removeTag = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
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
      throw new Error("Only admins can manage tags");
    }

    const link = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback_tag", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("tagId", args.tagId)
      )
      .unique();

    if (link) {
      await ctx.db.delete(link._id);
    }

    return true;
  },
});

/**
 * Delete feedback
 */
export const remove = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

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
      throw new Error("You don't have permission to delete this feedback");
    }

    // Delete related data
    // Votes
    const votes = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.id))
      .collect();
    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.id))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Tags
    const tags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.id))
      .collect();
    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }

    // Release links
    const releaseLinks = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.id))
      .collect();
    for (const link of releaseLinks) {
      await ctx.db.delete(link._id);
    }

    // Notifications
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("feedbackId"), args.id))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // Delete feedback
    await ctx.db.delete(args.id);

    return true;
  },
});

/**
 * Update feedback status (for drag & drop in roadmap)
 */
export const updateStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    statusId: v.optional(v.id("boardStatuses")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check membership (members can update status)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Validate statusId belongs to the same board
    let newStatus = feedback.status;
    if (args.statusId) {
      const status = await ctx.db.get(args.statusId);
      if (!status || status.boardId !== feedback.boardId) {
        throw new Error("Invalid status for this board");
      }

      // Map custom status name to enum value for the status field
      // This ensures the list view badge displays correctly
      newStatus = mapStatusNameToEnum(status.name);
    }

    await ctx.db.patch(args.feedbackId, {
      statusId: args.statusId,
      status: newStatus,
      updatedAt: Date.now(),
    });

    return args.feedbackId;
  },
});

/**
 * Map custom status name to the corresponding enum value
 * This ensures the status field stays in sync with statusId
 */
function mapStatusNameToEnum(
  statusName: string
):
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed" {
  const normalizedName = statusName.toLowerCase().replace(/[\s_-]/g, "");

  // Map common status names to enum values
  const statusMap: Record<
    string,
    "open" | "under_review" | "planned" | "in_progress" | "completed" | "closed"
  > = {
    open: "open",
    underreview: "under_review",
    "under review": "under_review",
    "under-review": "under_review",
    planned: "planned",
    inprogress: "in_progress",
    "in progress": "in_progress",
    "in-progress": "in_progress",
    completed: "completed",
    done: "completed",
    closed: "closed",
    resolved: "closed",
    archived: "closed",
  };

  return statusMap[normalizedName] ?? "open";
}
