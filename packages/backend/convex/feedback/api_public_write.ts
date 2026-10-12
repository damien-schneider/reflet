import { ConvexError, type ObjectType, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import { scheduleAfterCreate } from "./after_create";
import { isFeedbackPubliclyVisible } from "./public_projection";
import { statusFieldsFor } from "./status_target";
import { feedbackContextValidator } from "./tableFields";

const feedbackActorArgs = {
  externalUserId: v.id("externalUsers"),
  feedbackId: v.id("feedback"),
  hasPrivateAccess: v.boolean(),
  organizationId: v.id("organizations"),
};

async function requireActionableFeedback(
  ctx: MutationCtx,
  args: {
    feedbackId: Id<"feedback">;
    hasPrivateAccess: boolean;
    organizationId: Id<"organizations">;
  }
): Promise<Doc<"feedback">> {
  const feedback = await ctx.db.get(args.feedbackId);
  const visible =
    feedback?.organizationId === args.organizationId &&
    (args.hasPrivateAccess ||
      isFeedbackPubliclyVisible(
        await ctx.db.get(args.organizationId),
        feedback
      ));
  if (!(feedback && visible)) {
    throw new ConvexError("Feedback not found");
  }
  return feedback;
}

const createFeedbackArgs = {
  authorId: v.optional(v.string()),
  context: v.optional(feedbackContextValidator),
  description: v.string(),
  externalUserId: v.optional(v.id("externalUsers")),
  isInternal: v.optional(v.boolean()),
  organizationId: v.id("organizations"),
  tagId: v.optional(v.id("tags")),
  title: v.string(),
};

async function followAsExternalAuthor(
  ctx: MutationCtx,
  options: { externalUserId: Id<"externalUsers">; feedbackId: Id<"feedback"> }
): Promise<void> {
  const createdAt = Date.now();
  await ctx.db.insert("feedbackVotes", {
    createdAt,
    externalUserId: options.externalUserId,
    feedbackId: options.feedbackId,
    voteType: "upvote",
  });
  await ctx.db.insert("feedbackSubscriptions", {
    createdAt,
    externalUserId: options.externalUserId,
    feedbackId: options.feedbackId,
  });
}

async function applyCreationTag(
  ctx: MutationCtx,
  options: {
    feedbackId: Id<"feedback">;
    organizationId: Id<"organizations">;
    tagId: Id<"tags">;
  }
): Promise<void> {
  const tag = await ctx.db.get(options.tagId);
  if (tag?.organizationId !== options.organizationId) {
    throw new Error("Category does not belong to this organization");
  }
  await ctx.db.insert("feedbackTags", {
    appliedByAi: false,
    feedbackId: options.feedbackId,
    tagId: options.tagId,
  });
}

async function applyAuthorAndTag(
  ctx: MutationCtx,
  options: {
    args: Pick<
      ObjectType<typeof createFeedbackArgs>,
      "externalUserId" | "organizationId" | "tagId"
    >;
    feedbackId: Id<"feedback">;
  }
): Promise<void> {
  const { args, feedbackId } = options;
  if (args.externalUserId) {
    await followAsExternalAuthor(ctx, {
      externalUserId: args.externalUserId,
      feedbackId,
    });
  }
  if (args.tagId) {
    await applyCreationTag(ctx, {
      feedbackId,
      organizationId: args.organizationId,
      tagId: args.tagId,
    });
  }
}

async function defaultStatusOf(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) {
  const org = await ctx.db.get(organizationId);
  if (!org) {
    throw new Error("Organization not found");
  }
  return org.feedbackSettings?.defaultStatus ?? "open";
}

export async function insertOrganizationFeedback(
  ctx: MutationCtx,
  args: ObjectType<typeof createFeedbackArgs> & {
    sessionProposalId?: Id<"sessionProposals">;
  }
): Promise<{ feedbackId: Id<"feedback">; isApproved: boolean }> {
  validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
  validateInputLength(args.description, MAX_DESCRIPTION_LENGTH, "Description");

  const defaultStatus = await defaultStatusOf(ctx, args.organizationId);

  const isAnonymous = !args.externalUserId;
  const isInternal = args.isInternal === true;
  const isApproved = false;
  const now = Date.now();

  const feedbackId = await ctx.db.insert("feedback", {
    authorId: args.authorId,
    commentCount: 0,
    context: args.context,
    createdAt: now,
    description: args.description,
    externalUserId: args.externalUserId,
    isApproved,
    isInternal: isInternal || undefined,
    isPinned: false,
    organizationId: args.organizationId,
    sessionProposalId: args.sessionProposalId,
    source: "api",
    ...(await statusFieldsFor(ctx, {
      organizationId: args.organizationId,
      status: defaultStatus,
    })),
    title: args.title,
    updatedAt: now,
    voteCount: isAnonymous ? 0 : 1,
  });

  await applyAuthorAndTag(ctx, { args, feedbackId });

  await scheduleAfterCreate(ctx, feedbackId, {
    aiEnrichment: false,
    autoTagging: true,
  });

  return { feedbackId, isApproved };
}

export const createFeedbackByOrganization = internalMutation({
  args: createFeedbackArgs,
  handler: (ctx, args) => insertOrganizationFeedback(ctx, args),
});

export const voteFeedbackByOrganization = internalMutation({
  args: {
    ...feedbackActorArgs,
    voteType: v.optional(v.union(v.literal("upvote"), v.literal("downvote"))),
  },
  handler: async (ctx, args) => {
    const voteType = args.voteType ?? "upvote";
    const feedback = await requireActionableFeedback(ctx, args);

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
    ...feedbackActorArgs,
    body: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const { feedbackId, body, externalUserId, parentId } = args;

    validateInputLength(body, MAX_COMMENT_LENGTH, "Comment");

    const feedback = await requireActionableFeedback(ctx, args);

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
  args: feedbackActorArgs,
  handler: async (ctx, args) => {
    const { feedbackId, externalUserId } = args;

    await requireActionableFeedback(ctx, args);

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
  args: feedbackActorArgs,
  handler: async (ctx, args) => {
    const { feedbackId, externalUserId } = args;

    await requireActionableFeedback(ctx, args);

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
