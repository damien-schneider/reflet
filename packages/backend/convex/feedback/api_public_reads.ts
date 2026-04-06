import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";

/**
 * Get single feedback item for public API
 */
export const getFeedbackByOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    externalUserId: v.optional(v.id("externalUsers")),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.deletedAt) {
      return null;
    }

    // Verify organization matches
    if (feedback.organizationId !== args.organizationId) {
      return null;
    }

    // Must be approved for public API
    if (!feedback.isApproved) {
      return null;
    }

    // Get organization status
    let organizationStatus: {
      id: Id<"organizationStatuses">;
      name: string;
      color: string;
    } | null = null;
    if (feedback.organizationStatusId) {
      const status = await ctx.db.get(feedback.organizationStatusId);
      if (status) {
        organizationStatus = {
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
        return tag
          ? { id: tag._id, name: tag.name, slug: tag.slug, color: tag.color }
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
      organizationStatus,
      author,
    };
  },
});

/**
 * List comments for feedback item
 */
export const listCommentsByOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
  },
  handler: async (ctx, args) => {
    // Verify feedback exists and belongs to organization
    const feedback = await ctx.db.get(args.feedbackId);
    if (
      !feedback ||
      feedback.organizationId !== args.organizationId ||
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
export const getRoadmapByOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = args;

    const org = await ctx.db.get(organizationId);
    if (!org) {
      return null;
    }

    // Get organization statuses for roadmap columns
    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_org_order", (q) => q.eq("organizationId", organizationId))
      .collect();

    const sortedStatuses = orgStatuses.sort((a, b) => a.order - b.order);

    // Get all approved feedback (excluding soft-deleted)
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    const approvedFeedback = feedbackItems.filter(
      (f) => f.isApproved && !f.deletedAt && !f.isMerged
    );

    // Group by organization status
    const lanes = sortedStatuses.map((status) => ({
      id: status._id,
      name: status.name,
      slug: status.name.toLowerCase().replace(/\s+/g, "-"),
      color: status.color,
      items: approvedFeedback
        .filter((f) => f.organizationStatusId === status._id)
        .sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))
        .map((f) => ({
          id: f._id,
          title: f.title,
          status: f.status,
          voteCount: f.voteCount,
        })),
    }));

    return {
      lanes,
    };
  },
});

/**
 * Get changelog/releases for public API
 */
export const getChangelogByOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId, limit = 20 } = args;

    const org = await ctx.db.get(organizationId);
    if (!org) {
      return [];
    }

    // Get published releases (publishedAt is set)
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .filter((q) => q.neq(q.field("publishedAt"), undefined))
      .order("desc")
      .take(limit);

    // Get feedback for each release
    const result = await Promise.all(
      releases.map(async (release) => {
        const releaseFeedback = await ctx.db
          .query("releaseFeedback")
          .withIndex("by_release", (q) => q.eq("releaseId", release._id))
          .collect();

        const feedbackItems = await Promise.all(
          releaseFeedback.map(async (rf) => {
            const feedback = await ctx.db.get(rf.feedbackId);
            return feedback
              ? {
                  id: feedback._id,
                  title: feedback.title,
                  status: feedback.status,
                }
              : null;
          })
        );

        return {
          id: release._id,
          title: release.title,
          description: release.description,
          version: release.version,
          publishedAt: release.publishedAt,
          items: feedbackItems.filter(
            (f): f is NonNullable<typeof f> => f !== null
          ),
        };
      })
    );

    return result;
  },
});

/**
 * Search for similar feedback by title (used for "Did you mean?" in widget)
 */
export const searchSimilarFeedback = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("feedback"),
      title: v.string(),
      voteCount: v.number(),
      status: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    if (args.title.length < 3) {
      return [];
    }

    const results = await ctx.db
      .query("feedback")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.title).eq("organizationId", args.organizationId)
      )
      .take(5);

    return results
      .filter((f) => f.isApproved && !f.deletedAt && !f.isMerged)
      .map((f) => ({
        _id: f._id,
        title: f.title,
        voteCount: f.voteCount,
        status: f.status,
      }));
  },
});
