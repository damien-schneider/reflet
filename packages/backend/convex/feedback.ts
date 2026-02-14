import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
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
// HELPERS
// ============================================

interface UserProfile {
  name?: string;
  email?: string;
  image?: string | null;
}

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

const getMembershipInfo = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  userId: string
): Promise<{ isMember: boolean; role: string | null }> => {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();
  return { isMember: !!membership, role: membership?.role ?? null };
};

const getFeedbackTags = async (ctx: QueryCtx, feedbackId: Id<"feedback">) => {
  const feedbackTags = await ctx.db
    .query("feedbackTags")
    .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
    .collect();

  const tags = await Promise.all(
    feedbackTags.map(async (ft) => {
      const tag = await ctx.db.get(ft.tagId);
      if (!tag) {
        return null;
      }
      return { ...tag, appliedByAi: ft.appliedByAi ?? false };
    })
  );

  return tags.filter(Boolean);
};

const getUserVoteInfo = async (
  ctx: QueryCtx,
  feedbackId: Id<"feedback">,
  userId: string
): Promise<{
  hasVoted: boolean;
  userVoteType: "upvote" | "downvote" | null;
}> => {
  const vote = await ctx.db
    .query("feedbackVotes")
    .withIndex("by_feedback_user", (q) =>
      q.eq("feedbackId", feedbackId).eq("userId", userId)
    )
    .unique();
  return { hasVoted: !!vote, userVoteType: vote?.voteType ?? null };
};

const resolveUserProfile = async (
  ctx: QueryCtx,
  userId: string
): Promise<UserProfile | null> => {
  const userData = await authComponent.getAnyUserById(ctx, userId);
  if (!userData) {
    return null;
  }
  return {
    name: userData.name ?? null,
    email: userData.email ?? "",
    image: userData.image ?? null,
  };
};

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
// QUERIES
// ============================================

/**
 * Get a single feedback item by ID
 */
export const get = query({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.id);
    if (!feedback || feedback.deletedAt) {
      return null;
    }

    const org = await ctx.db.get(feedback.organizationId);
    if (!org) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    const { isMember, role } = user
      ? await getMembershipInfo(ctx, feedback.organizationId, user._id)
      : { isMember: false, role: null };

    if (!(isMember || org.isPublic)) {
      return null;
    }
    if (!(isMember || feedback.isApproved)) {
      return null;
    }

    const tags = await getFeedbackTags(ctx, args.id);

    const { hasVoted, userVoteType } = user
      ? await getUserVoteInfo(ctx, args.id, user._id)
      : { hasVoted: false, userVoteType: null };

    const organizationStatus = feedback.organizationStatusId
      ? await ctx.db.get(feedback.organizationStatusId)
      : null;

    const author = feedback.authorId
      ? await resolveUserProfile(ctx, feedback.authorId)
      : null;

    let assignee: ({ id: string } & UserProfile) | null = null;
    if (feedback.assigneeId) {
      const profile = await resolveUserProfile(ctx, feedback.assigneeId);
      if (profile) {
        assignee = { id: feedback.assigneeId, ...profile };
      }
    }

    return {
      ...feedback,
      organization: org,
      organizationStatus,
      tags,
      hasVoted,
      userVoteType,
      isMember,
      role,
      isAuthor: user?._id === feedback.authorId,
      author,
      assignee,
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
    organizationId: v.id("organizations"),
    tagId: v.optional(v.id("tags")), // Optional tag for categorization
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
