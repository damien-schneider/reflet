import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import {
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import { feedbackContextValidator } from "./tableFields";

const MIN_IMPORTANCE = 1;
const MAX_IMPORTANCE = 4;

export const createFeedbackByOrganization = internalMutation({
  args: {
    context: v.optional(feedbackContextValidator),
    description: v.string(),
    externalUserId: v.optional(v.id("externalUsers")),
    organizationId: v.id("organizations"),
    tagId: v.optional(v.id("tags")),
    title: v.string(),
  },
  handler: async (ctx, args) => {
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
      commentCount: 0,
      context: args.context,
      createdAt: now,
      description: args.description,
      externalUserId: args.externalUserId,
      isApproved: !requireApproval,
      isPinned: false,
      organizationId: args.organizationId,
      organizationStatusId: defaultOrgStatus?._id,
      source: "api",
      status: defaultStatus,
      title: args.title,
      updatedAt: now,
      voteCount: isAnonymous ? 0 : 1,
    });

    if (args.externalUserId) {
      await ctx.db.insert("feedbackVotes", {
        createdAt: now,
        externalUserId: args.externalUserId,
        feedbackId,
        voteType: "upvote",
      });

      await ctx.db.insert("feedbackSubscriptions", {
        createdAt: now,
        externalUserId: args.externalUserId,
        feedbackId,
      });
    }

    if (args.tagId) {
      await ctx.db.insert("feedbackTags", { feedbackId, tagId: args.tagId });
    }

    await ctx.scheduler.runAfter(
      0,
      internal.duplicates.detection.findSimilarFeedback,
      { feedbackId }
    );

    return { feedbackId, isApproved: !requireApproval };
  },
});

export const voteFeedbackByOrganization = internalMutation({
  args: {
    externalUserId: v.id("externalUsers"),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
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

    const existingVote = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback_external_user", (q) =>
        q
          .eq("feedbackId", args.feedbackId)
          .eq("externalUserId", args.externalUserId)
      )
      .unique();

    const delta = voteType === "upvote" ? 1 : -1;
    let newVoteCount = feedback.voteCount;
    let voted = false;

    if (existingVote?.voteType === voteType) {
      await ctx.db.delete(existingVote._id);
      newVoteCount -= delta;
    } else if (existingVote) {
      await ctx.db.patch(existingVote._id, { voteType });
      newVoteCount += 2 * delta;
      voted = true;
    } else {
      await ctx.db.insert("feedbackVotes", {
        createdAt: Date.now(),
        externalUserId: args.externalUserId,
        feedbackId: args.feedbackId,
        voteType,
      });
      newVoteCount += delta;
      voted = true;
    }

    await ctx.db.patch(args.feedbackId, { voteCount: newVoteCount });

    return { voteCount: newVoteCount, voted };
  },
});

export const addCommentByOrganization = internalMutation({
  args: {
    body: v.string(),
    externalUserId: v.id("externalUsers"),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const { organizationId, feedbackId, body, externalUserId, parentId } = args;

    validateInputLength(body, MAX_COMMENT_LENGTH, "Comment");

    const feedback = await ctx.db.get(feedbackId);
    if (!feedback || feedback.organizationId !== organizationId) {
      throw new Error("Feedback not found");
    }

    if (parentId) {
      const parent = await ctx.db.get(parentId);
      if (!parent || parent.feedbackId !== feedbackId) {
        throw new Error("Parent comment not found");
      }
    }

    const now = Date.now();
    const commentId = await ctx.db.insert("comments", {
      body,
      createdAt: now,
      externalUserId,
      feedbackId,
      isOfficial: false,
      parentId,
      updatedAt: now,
    });

    await ctx.db.patch(feedbackId, {
      commentCount: (feedback.commentCount ?? 0) + 1,
      updatedAt: now,
    });

    return { id: commentId };
  },
});

export const subscribeFeedbackByOrganization = internalMutation({
  args: {
    externalUserId: v.id("externalUsers"),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { organizationId, feedbackId, externalUserId } = args;

    const feedback = await ctx.db.get(feedbackId);
    if (!feedback || feedback.organizationId !== organizationId) {
      throw new Error("Feedback not found");
    }

    const existing = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_external_user", (q) =>
        q.eq("feedbackId", feedbackId).eq("externalUserId", externalUserId)
      )
      .unique();

    if (existing) {
      return { alreadySubscribed: true, subscribed: true };
    }

    await ctx.db.insert("feedbackSubscriptions", {
      createdAt: Date.now(),
      externalUserId,
      feedbackId,
    });

    return { alreadySubscribed: false, subscribed: true };
  },
});

export const unsubscribeFeedbackByOrganization = internalMutation({
  args: {
    externalUserId: v.id("externalUsers"),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { organizationId, feedbackId, externalUserId } = args;

    const feedback = await ctx.db.get(feedbackId);
    if (!feedback || feedback.organizationId !== organizationId) {
      throw new Error("Feedback not found");
    }

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

export const setImportanceByOrganization = internalMutation({
  args: {
    externalUserId: v.id("externalUsers"),
    feedbackId: v.id("feedback"),
    importance: v.number(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    if (args.importance < MIN_IMPORTANCE || args.importance > MAX_IMPORTANCE) {
      throw new Error(
        `Importance must be between ${MIN_IMPORTANCE} and ${MAX_IMPORTANCE}`
      );
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback does not belong to this organization");
    }

    // importance votes are keyed by dashboard userId — external users get a
    // prefixed pseudo-id, so there is no index to look them up by
    const existingVotes = await ctx.db
      .query("feedbackImportanceVotes")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const externalUserId = `external_${args.externalUserId}`;
    const existingVote = existingVotes.find((v) => v.userId === externalUserId);

    const now = Date.now();

    if (existingVote) {
      await ctx.db.patch(existingVote._id, {
        importance: args.importance,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("feedbackImportanceVotes", {
        createdAt: now,
        feedbackId: args.feedbackId,
        importance: args.importance,
        updatedAt: now,
        userId: externalUserId,
      });
    }

    return { importance: args.importance, success: true };
  },
});
