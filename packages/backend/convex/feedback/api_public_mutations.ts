import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import {
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../shared/constants";
import { validateInputLength } from "../shared/validators";

/**
 * Create feedback via public API
 */
export const createFeedbackByOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    tagId: v.optional(v.id("tags")),
    externalUserId: v.optional(v.id("externalUsers")),
  },
  handler: async (ctx, args) => {
    // Validate input
    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Determine settings from tag or org defaults
    let requireApproval = org.feedbackSettings?.requireApproval ?? false;
    let defaultStatus:
      | "open"
      | "under_review"
      | "planned"
      | "in_progress"
      | "completed"
      | "closed" = org.feedbackSettings?.defaultStatus ?? "open";

    if (args.tagId) {
      const tag = await ctx.db.get(args.tagId);
      if (tag && tag.organizationId === args.organizationId) {
        requireApproval = tag.settings?.requireApproval ?? requireApproval;
        defaultStatus = tag.settings?.defaultStatus ?? defaultStatus;
      }
    }

    // Get the default organization status
    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_org_order", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const defaultOrgStatus = orgStatuses.sort((a, b) => a.order - b.order)[0];

    const isAnonymous = !args.externalUserId;

    const now = Date.now();
    const feedbackId = await ctx.db.insert("feedback", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      status: defaultStatus,
      organizationStatusId: defaultOrgStatus?._id,
      externalUserId: args.externalUserId,
      voteCount: isAnonymous ? 0 : 1,
      commentCount: 0,
      isApproved: !requireApproval,
      isPinned: false,
      source: "api",
      createdAt: now,
      updatedAt: now,
    });

    // Auto-vote and auto-subscribe for identified users
    if (args.externalUserId) {
      await ctx.db.insert("feedbackVotes", {
        feedbackId,
        externalUserId: args.externalUserId,
        voteType: "upvote",
        createdAt: now,
      });

      await ctx.db.insert("feedbackSubscriptions", {
        feedbackId,
        externalUserId: args.externalUserId,
        createdAt: now,
      });
    }

    // Add tag if provided
    if (args.tagId) {
      await ctx.db.insert("feedbackTags", {
        feedbackId,
        tagId: args.tagId,
      });
    }

    // Schedule duplicate detection
    await ctx.scheduler.runAfter(
      0,
      internal.duplicates.detection.findSimilarFeedback,
      { feedbackId }
    );

    return { feedbackId, isApproved: !requireApproval };
  },
});

/**
 * Vote on feedback via public API
 */
export const voteFeedbackByOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
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

    if (feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback does not belong to this organization");
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
 * Add a comment to feedback via public API
 */
export const addCommentByOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    body: v.string(),
    externalUserId: v.id("externalUsers"),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const { organizationId, feedbackId, body, externalUserId, parentId } = args;

    // Validate input
    validateInputLength(body, MAX_COMMENT_LENGTH, "Comment");

    // Verify feedback exists and belongs to organization
    const feedback = await ctx.db.get(feedbackId);
    if (!feedback || feedback.organizationId !== organizationId) {
      throw new Error("Feedback not found");
    }

    // Validate parent comment if provided
    if (parentId) {
      const parent = await ctx.db.get(parentId);
      if (!parent || parent.feedbackId !== feedbackId) {
        throw new Error("Parent comment not found");
      }
    }

    const now = Date.now();
    const commentId = await ctx.db.insert("comments", {
      feedbackId,
      body,
      externalUserId,
      parentId,
      isOfficial: false,
      createdAt: now,
      updatedAt: now,
    });

    // Update feedback comment count
    await ctx.db.patch(feedbackId, {
      commentCount: (feedback.commentCount ?? 0) + 1,
      updatedAt: now,
    });

    return { id: commentId };
  },
});

/**
 * Subscribe to feedback updates via public API
 */
export const subscribeFeedbackByOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    externalUserId: v.id("externalUsers"),
  },
  handler: async (ctx, args) => {
    const { organizationId, feedbackId, externalUserId } = args;

    // Verify feedback exists and belongs to organization
    const feedback = await ctx.db.get(feedbackId);
    if (!feedback || feedback.organizationId !== organizationId) {
      throw new Error("Feedback not found");
    }

    // Check if already subscribed
    const existing = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_external_user", (q) =>
        q.eq("feedbackId", feedbackId).eq("externalUserId", externalUserId)
      )
      .unique();

    if (existing) {
      return { subscribed: true, alreadySubscribed: true };
    }

    // Create subscription
    await ctx.db.insert("feedbackSubscriptions", {
      feedbackId,
      externalUserId,
      createdAt: Date.now(),
    });

    return { subscribed: true, alreadySubscribed: false };
  },
});

/**
 * Unsubscribe from feedback updates via public API
 */
export const unsubscribeFeedbackByOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    externalUserId: v.id("externalUsers"),
  },
  handler: async (ctx, args) => {
    const { organizationId, feedbackId, externalUserId } = args;

    // Verify feedback exists and belongs to organization
    const feedback = await ctx.db.get(feedbackId);
    if (!feedback || feedback.organizationId !== organizationId) {
      throw new Error("Feedback not found");
    }

    // Find and delete subscription
    const subscription = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_external_user", (q) =>
        q.eq("feedbackId", feedbackId).eq("externalUserId", externalUserId)
      )
      .unique();

    if (subscription) {
      await ctx.db.delete(subscription._id);
      return { unsubscribed: true };
    }

    return { unsubscribed: false };
  },
});

/**
 * Set importance vote via public API
 */
export const setImportanceByOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
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

    if (feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback does not belong to this organization");
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
