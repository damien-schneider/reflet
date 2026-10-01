import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { toPublicOrganization } from "../organizations/queries";
import { getFeedbackCategories } from "./categories/visibility";
import {
  isFeedbackPubliclyVisible,
  projectFeedbackFor,
} from "./public_projection";

interface UserProfile {
  email?: string;
  image?: string | null;
  name?: string;
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
  userId: string,
  includeEmail: boolean
): Promise<UserProfile | null> => {
  if (userId.startsWith("anonymous:")) {
    return null;
  }

  const userData = await authComponent.getAnyUserById(ctx, userId);
  if (!userData) {
    return null;
  }
  return {
    email: includeEmail ? (userData.email ?? "") : undefined,
    image: userData.image ?? null,
    name: userData.name ?? null,
  };
};

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

    if (!isFeedbackPubliclyVisible(org, feedback)) {
      return null;
    }

    return {
      description: feedback.description,
      orgName: org.name,
      orgSlug: org.slug,
      status: feedback.status,
      title: feedback.title,
      voteCount: feedback.voteCount ?? 0,
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

    if (!isFeedbackPubliclyVisible(org, feedback)) {
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
      description: feedback.description,
      orgName: org.name,
      orgSlug: org.slug,
      releaseTitle,
      status: feedback.status,
      title: feedback.title,
      voteCount: feedback.voteCount ?? 0,
    };
  },
});

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
    if (!(isMember || isFeedbackPubliclyVisible(org, feedback))) {
      return null;
    }

    const tags = await getFeedbackCategories(ctx, args.id, isMember);

    const { hasVoted, userVoteType } = user
      ? await getUserVoteInfo(ctx, args.id, user._id)
      : { hasVoted: false, userVoteType: null };

    const organizationStatus = feedback.organizationStatusId
      ? await ctx.db.get(feedback.organizationStatusId)
      : null;

    const author = feedback.authorId
      ? await resolveUserProfile(ctx, feedback.authorId, isMember)
      : null;

    let assignee: ({ id: string } & UserProfile) | null = null;
    if (isMember && feedback.assigneeId) {
      const profile = await resolveUserProfile(ctx, feedback.assigneeId, true);
      if (profile) {
        assignee = { id: feedback.assigneeId, ...profile };
      }
    }

    return {
      ...projectFeedbackFor(feedback, isMember),
      assignee,
      author,
      hasVoted,
      isAuthor: user?._id === feedback.authorId,
      isMember,
      organization: isMember ? org : toPublicOrganization(org),
      organizationStatus,
      role,
      tags,
      userVoteType,
    };
  },
});
