import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { PLAN_LIMITS } from "../organizations/queries";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "../shared/constants";
import { getAuthUser } from "../shared/utils";
import { feedbackStatus, validateInputLength } from "../shared/validators";

// ============================================
// HELPERS
// ============================================

type FeedbackStatusValue =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

const FEEDBACK_STATUS_VALUES: readonly string[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
];

const isFeedbackStatusValue = (value: unknown): value is FeedbackStatusValue =>
  typeof value === "string" && FEEDBACK_STATUS_VALUES.includes(value);

const resolveTagSettings = async (
  ctx: MutationCtx,
  tagId: Id<"tags"> | undefined,
  organizationId: Id<"organizations">
): Promise<{
  requireApproval: boolean;
  defaultStatus: FeedbackStatusValue;
}> => {
  if (!tagId) {
    return { requireApproval: false, defaultStatus: "open" };
  }

  const tag = await ctx.db.get(tagId);
  if (!tag || tag.organizationId !== organizationId) {
    return { requireApproval: false, defaultStatus: "open" };
  }

  return {
    requireApproval: tag.settings?.requireApproval ?? false,
    defaultStatus: isFeedbackStatusValue(tag.settings?.defaultStatus)
      ? tag.settings.defaultStatus
      : "open",
  };
};

const validateCreateAccess = async (
  ctx: MutationCtx,
  org: { _id: Id<"organizations">; isPublic: boolean },
  userId: string,
  tagId?: Id<"tags">
): Promise<void> => {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", org._id).eq("userId", userId)
    )
    .unique();

  const isMember = !!membership;
  let hasAccess = isMember || org.isPublic;

  if (tagId && !isMember) {
    const tag = await ctx.db.get(tagId);
    hasAccess = hasAccess && (tag?.settings?.isPublic ?? false);
  }

  if (!hasAccess) {
    throw new Error("You don't have access to submit feedback");
  }
};

const enforceFeedbackLimit = async (
  ctx: MutationCtx,
  orgId: Id<"organizations">,
  subscriptionTier: keyof typeof PLAN_LIMITS
): Promise<void> => {
  const existingFeedback = await ctx.db
    .query("feedback")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .collect();
  const activeFeedback = existingFeedback.filter((f) => !f.deletedAt);

  const limit = PLAN_LIMITS[subscriptionTier].maxFeedbackPerBoard * 10;
  if (activeFeedback.length >= limit) {
    throw new Error(
      `Feedback limit reached. This organization allows ${limit} feedback items.`
    );
  }
};

const getDefaultOrganizationStatusId = async (
  ctx: MutationCtx,
  orgId: Id<"organizations">
): Promise<Id<"organizationStatuses"> | undefined> => {
  const orgStatuses = await ctx.db
    .query("organizationStatuses")
    .withIndex("by_org_order", (q) => q.eq("organizationId", orgId))
    .collect();
  const sorted = orgStatuses.sort((a, b) => a.order - b.order);
  return sorted[0]?._id;
};

// ============================================
// MUTATIONS
// ============================================

/**
 * Create new feedback
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    tagId: v.optional(v.id("tags")),
    title: v.string(),
    description: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );

    const tagSettings = await resolveTagSettings(
      ctx,
      args.tagId,
      args.organizationId
    );

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const requireApproval =
      tagSettings.requireApproval ||
      (org.feedbackSettings?.requireApproval ?? false);
    const defaultStatus =
      tagSettings.defaultStatus ||
      (isFeedbackStatusValue(org.feedbackSettings?.defaultStatus)
        ? org.feedbackSettings.defaultStatus
        : "open");

    await validateCreateAccess(ctx, org, user._id, args.tagId);
    await enforceFeedbackLimit(ctx, org._id, org.subscriptionTier);

    const defaultOrgStatusId = await getDefaultOrganizationStatusId(
      ctx,
      org._id
    );

    const now = Date.now();
    const feedbackId = await ctx.db.insert("feedback", {
      organizationId: org._id,
      title: args.title,
      description: args.description,
      status: defaultStatus,
      organizationStatusId: defaultOrgStatusId,
      authorId: user._id,
      voteCount: 1,
      commentCount: 0,
      isApproved: !requireApproval,
      isPinned: false,
      attachments: args.attachments,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("feedbackVotes", {
      feedbackId,
      userId: user._id,
      voteType: "upvote",
      createdAt: now,
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
    organizationStatusId: v.optional(v.id("organizationStatuses")),
    isApproved: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    roadmapOrder: v.optional(v.number()),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

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
      const { id, ...updates } = args;

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
        args.organizationStatusId !== undefined ||
        args.isApproved !== undefined ||
        args.isPinned !== undefined ||
        args.roadmapOrder !== undefined
      ) {
        throw new Error("Only admins can update these fields");
      }
      await ctx.db.patch(id, { title, description, updatedAt: Date.now() });
    }

    return args.id;
  },
});
