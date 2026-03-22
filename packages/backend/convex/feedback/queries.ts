import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";

// ============================================
// HELPERS
// ============================================

interface UserProfile {
  name?: string;
  email?: string;
  image?: string | null;
}

export const getMembershipInfo = async (
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

export const getFeedbackTags = async (
  ctx: QueryCtx,
  feedbackId: Id<"feedback">
) => {
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

// ============================================
// QUERIES
// ============================================

/**
 * Get minimal public metadata for a feedback item (no auth required).
 * Used for server-side SEO metadata generation.
 */
export const getPublicMeta = query({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.id);
    if (!feedback || feedback.deletedAt) {
      return null;
    }

    const org = await ctx.db.get(feedback.organizationId);
    if (!org?.isPublic) {
      return null;
    }

    if (!feedback.isApproved) {
      return null;
    }

    return {
      title: feedback.title,
      description: feedback.description,
      status: feedback.status,
      voteCount: feedback.voteCount ?? 0,
      orgName: org.name,
      orgSlug: org.slug,
    };
  },
});

export const getShippedMeta = query({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.id);
    if (!feedback || feedback.deletedAt) {
      return null;
    }

    const org = await ctx.db.get(feedback.organizationId);
    if (!org?.isPublic) {
      return null;
    }

    if (!feedback.isApproved) {
      return null;
    }

    const releaseLink = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.id))
      .first();

    let releaseTitle: string | null = null;
    if (releaseLink) {
      const release = await ctx.db.get(releaseLink.releaseId);
      if (release) {
        releaseTitle = release.title;
      }
    }

    return {
      title: feedback.title,
      description: feedback.description,
      status: feedback.status,
      voteCount: feedback.voteCount ?? 0,
      orgName: org.name,
      orgSlug: org.slug,
      releaseTitle,
    };
  },
});

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
