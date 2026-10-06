import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { requireAuthUser } from "../shared/access";
import { rateLimiter } from "../shared/rate_limits";
import { feedbackStatus } from "../shared/validators";
import { afterApproval, scheduleAfterCreate } from "./after_create";
import { isFeedbackPublishable } from "./property_values";
import { changePublication } from "./publication";
import { changeFeedbackStatus } from "./status_change";
import { statusFieldsFor } from "./status_target";
import {
  enforceFeedbackLimit,
  validateFeedbackSubmission,
} from "./submission_limits";

const validateCreateAccess = async (
  ctx: MutationCtx,
  org: { _id: Id<"organizations">; isPublic: boolean },
  userId: string
): Promise<void> => {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", org._id).eq("userId", userId)
    )
    .unique();
  if (!(membership || org.isPublic)) {
    throw new Error("You don't have access to submit feedback");
  }
};

export const create = mutation({
  args: {
    attachments: v.optional(v.array(v.string())),
    description: v.string(),
    organizationId: v.id("organizations"),
    tagId: v.optional(v.id("tags")),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    validateFeedbackSubmission(args);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const defaultStatus = org.feedbackSettings?.defaultStatus ?? "open";
    await validateCreateAccess(ctx, org, user._id);
    await rateLimiter.limit(ctx, "feedbackPerUser", {
      key: user._id,
      throws: true,
    });
    await enforceFeedbackLimit(ctx, org._id);

    const now = Date.now();
    const feedbackId = await ctx.db.insert("feedback", {
      attachments: args.attachments,
      authorId: user._id,
      commentCount: 0,
      createdAt: now,
      description: args.description,
      isApproved: false,
      isPinned: false,
      organizationId: org._id,
      ...(await statusFieldsFor(ctx, {
        organizationId: org._id,
        status: defaultStatus,
      })),
      title: args.title,
      updatedAt: now,
      voteCount: 1,
    });

    await ctx.db.insert("feedbackVotes", {
      createdAt: now,
      feedbackId,
      userId: user._id,
      voteType: "upvote",
    });

    if (args.tagId) {
      const tag = await ctx.db.get(args.tagId);
      if (tag && tag.organizationId === args.organizationId) {
        await ctx.db.insert("feedbackTags", {
          feedbackId,
          tagId: args.tagId,
        });
      }
    }

    await scheduleAfterCreate(ctx, feedbackId, {
      aiEnrichment: true,
      autoTagging: true,
    });

    return feedbackId;
  },
});

export const update = mutation({
  args: {
    attachments: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    id: v.id("feedback"),
    isApproved: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    organizationStatusId: v.optional(v.id("organizationStatuses")),
    roadmapOrder: v.optional(v.number()),
    status: v.optional(feedbackStatus),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    validateFeedbackSubmission(args);

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

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

    if (isAdmin) {
      const { id, organizationStatusId, status, ...updates } = args;
      await ctx.db.patch(id, {
        ...updates,
        ...(args.isApproved === undefined
          ? {}
          : {
              publicationRejectedAt: undefined,
              publicationReviewedAt: Date.now(),
              publicationReviewedBy: user._id,
            }),
        updatedAt: Date.now(),
      });
      await changeFeedbackStatus(ctx, feedback, {
        actorId: user._id,
        organizationStatusId,
        source: "user",
        status,
      });
      const becameApproved = args.isApproved === true && !feedback.isApproved;
      if (becameApproved) {
        await afterApproval(ctx, { ...feedback, isApproved: true });
      }
    } else {
      if (
        args.status !== undefined ||
        args.organizationStatusId !== undefined ||
        args.isApproved !== undefined ||
        args.isPinned !== undefined ||
        args.roadmapOrder !== undefined
      ) {
        throw new Error("Only admins can update these fields");
      }
      await applyAuthorEdit(ctx, feedback, {
        actorId: user._id,
        attachments: args.attachments,
        description: args.description,
        title: args.title,
      });
    }

    return args.id;
  },
});

const applyAuthorEdit = async (
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  edit: {
    actorId: string;
    attachments?: string[];
    description?: string;
    title?: string;
  }
): Promise<void> => {
  const { actorId, ...fields } = edit;
  const changedFields = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  );
  await ctx.db.patch(feedback._id, { ...changedFields, updatedAt: Date.now() });

  const org = await ctx.db.get(feedback.organizationId);
  const approvalRequired = org?.feedbackSettings?.requireApproval === true;
  if (approvalRequired && isFeedbackPublishable(feedback)) {
    await changePublication(ctx, feedback, { actorId, state: "pending" });
  }
};
