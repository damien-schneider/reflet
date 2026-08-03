import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import { feedbackContextValidator } from "./tableFields";

// ============================================
// TYPES
// ============================================

const feedbackStatus = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("closed")
);

// ============================================
// QUERIES
// ============================================

/**
 * Get organization configuration for the public API
 */
export const getOrganizationConfig = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    // Get organization statuses
    const statuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    statuses.sort((a, b) => a.order - b.order);

    // Get public tags
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const publicTags = tags.filter((t) => t.settings?.isPublic);

    return {
      feedbackSettings: org.feedbackSettings,
      id: org._id,
      isPublic: org.isPublic,
      logo: org.logo,
      name: org.name,
      primaryColor: org.primaryColor,
      slug: org.slug,
      statuses: statuses.map((s) => ({
        color: s.color,
        icon: s.icon,
        id: s._id,
        name: s.name,
        order: s.order,
      })),
      tags: publicTags.map((t) => ({
        color: t.color,
        description: t.description,
        id: t._id,
        name: t.name,
        slug: t.slug,
      })),
    };
  },
});

/**
 * List feedback by organization for public API
 */
export const listFeedbackByOrganization = internalQuery({
  args: {
    externalUserId: v.optional(v.id("externalUsers")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    organizationId: v.id("organizations"),
    search: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal("votes"),
        v.literal("newest"),
        v.literal("oldest"),
        v.literal("comments")
      )
    ),
    status: v.optional(feedbackStatus),
    statusId: v.optional(v.id("organizationStatuses")),
    tagId: v.optional(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return { hasMore: false, items: [], total: 0 };
    }

    // Get all feedback for this organization (excluding soft-deleted)
    let feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter to approved only and exclude soft-deleted and merged (public API always shows approved)
    feedbackItems = feedbackItems.filter(
      (f) => f.isApproved && !f.deletedAt && !f.isMerged
    );

    // Filter by organization status
    if (args.statusId) {
      feedbackItems = feedbackItems.filter(
        (f) => f.organizationStatusId === args.statusId
      );
    }

    if (args.status) {
      feedbackItems = feedbackItems.filter((f) => f.status === args.status);
    }

    // Filter by tag
    if (args.tagId) {
      const feedbackWithTag = await Promise.all(
        feedbackItems.map(async (f) => {
          const tags = await ctx.db
            .query("feedbackTags")
            .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
            .collect();
          const hasTag = tags.some((t) => t.tagId === args.tagId);
          return hasTag ? f : null;
        })
      );
      feedbackItems = feedbackWithTag.filter(Boolean) as typeof feedbackItems;
    }

    // Search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      feedbackItems = feedbackItems.filter(
        (f) =>
          f.title.toLowerCase().includes(searchLower) ||
          f.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    const sortBy = args.sortBy ?? "votes";
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
        feedbackItems.sort((a, b) => b.voteCount - a.voteCount);
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

    const total = feedbackItems.length;

    // Pagination
    const offset = args.offset ?? 0;
    const limit = Math.min(args.limit ?? 50, 100);
    feedbackItems = feedbackItems.slice(offset, offset + limit);

    // Get organization statuses for enrichment
    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const statusMap = new Map(orgStatuses.map((s) => [s._id, s]));

    // Enrich with details
    const items = await Promise.all(
      feedbackItems.map(async (f) => {
        // Get tags
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const tags = await Promise.all(
          feedbackTags.map(async (ft) => {
            const tag = await ctx.db.get(ft.tagId);
            return tag
              ? {
                  color: tag.color,
                  id: tag._id,
                  name: tag.name,
                  slug: tag.slug,
                }
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
                .eq("feedbackId", f._id)
                .eq("externalUserId", args.externalUserId)
            )
            .unique();
          hasVoted = !!vote;
        }

        // Get organization status
        const orgStatus = f.organizationStatusId
          ? statusMap.get(f.organizationStatusId)
          : null;

        // Get author info (external user if available)
        let author: {
          name: string | undefined;
          email: string | undefined;
          avatar: string | undefined;
          isExternal: boolean;
        } | null = null;
        if (f.externalUserId) {
          const extUser = await ctx.db.get(f.externalUserId);
          if (extUser) {
            author = {
              avatar: extUser.avatar,
              email: extUser.email,
              isExternal: true,
              name: extUser.name,
            };
          }
        }

        return {
          author,
          commentCount: f.commentCount,
          completedAt: f.completedAt,
          createdAt: f.createdAt,
          description: f.description,
          hasVoted,
          id: f._id,
          isPinned: f.isPinned,
          organizationStatus: orgStatus
            ? {
                color: orgStatus.color,
                id: orgStatus._id,
                name: orgStatus.name,
              }
            : null,
          status: f.status,
          tags: tags.filter(Boolean),
          title: f.title,
          updatedAt: f.updatedAt,
          voteCount: f.voteCount,
        };
      })
    );

    return {
      hasMore: offset + limit < total,
      items,
      total,
    };
  },
});

/**
 * Get single feedback item for public API
 */
export const getFeedbackByOrganization = internalQuery({
  args: {
    externalUserId: v.optional(v.id("externalUsers")),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
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
          color: status.color,
          id: status._id,
          name: status.name,
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
          ? { color: tag.color, id: tag._id, name: tag.name, slug: tag.slug }
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
          avatar: extUser.avatar,
          email: extUser.email,
          isExternal: true,
          name: extUser.name,
        };
      }
    }

    return {
      author,
      commentCount: feedback.commentCount,
      completedAt: feedback.completedAt,
      createdAt: feedback.createdAt,
      description: feedback.description,
      hasVoted,
      id: feedback._id,
      isPinned: feedback.isPinned,
      isSubscribed,
      organizationStatus,
      status: feedback.status,
      tags: tags.filter(Boolean),
      title: feedback.title,
      updatedAt: feedback.updatedAt,
      voteCount: feedback.voteCount,
    };
  },
});

/**
 * List comments for feedback item
 */
export const listCommentsByOrganization = internalQuery({
  args: {
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
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
            avatar: extUser.avatar,
            email: extUser.email,
            isExternal: true,
            name: extUser.name,
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
              author: replyAuthor,
              body: reply.body,
              createdAt: reply.createdAt,
              id: reply._id,
              isOfficial: reply.isOfficial,
              updatedAt: reply.updatedAt,
            };
          })
        );

        return {
          author,
          body: comment.body,
          createdAt: comment.createdAt,
          id: comment._id,
          isOfficial: comment.isOfficial,
          replies,
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
      color: status.color,
      id: status._id,
      items: approvedFeedback
        .filter((f) => f.organizationStatusId === status._id)
        .sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))
        .map((f) => ({
          id: f._id,
          status: f.status,
          title: f.title,
          voteCount: f.voteCount,
        })),
      name: status.name,
      slug: status.name.toLowerCase().replace(/\s+/g, "-"),
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
    limit: v.optional(v.number()),
    organizationId: v.id("organizations"),
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
                  status: feedback.status,
                  title: feedback.title,
                }
              : null;
          })
        );

        return {
          description: release.description,
          id: release._id,
          items: feedbackItems.filter(
            (f): f is NonNullable<typeof f> => f !== null
          ),
          publishedAt: release.publishedAt,
          title: release.title,
          version: release.version,
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
        status: f.status,
        title: f.title,
        voteCount: f.voteCount,
      }));
  },
  returns: v.array(
    v.object({
      _id: v.id("feedback"),
      status: v.string(),
      title: v.string(),
      voteCount: v.number(),
    })
  ),
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create feedback via public API
 */
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

    // Auto-vote and auto-subscribe for identified users
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
        createdAt: Date.now(),
        externalUserId: args.externalUserId,
        feedbackId: args.feedbackId,
        voteType,
      });
      newVoteCount =
        voteType === "upvote" ? newVoteCount + 1 : newVoteCount - 1;
      voted = true;
    }

    // Update vote count
    await ctx.db.patch(args.feedbackId, { voteCount: newVoteCount });

    return { voteCount: newVoteCount, voted };
  },
});

/**
 * Add a comment to feedback via public API
 */
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
      body,
      createdAt: now,
      externalUserId,
      feedbackId,
      isOfficial: false,
      parentId,
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
    externalUserId: v.id("externalUsers"),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
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
      return { alreadySubscribed: true, subscribed: true };
    }

    // Create subscription
    await ctx.db.insert("feedbackSubscriptions", {
      createdAt: Date.now(),
      externalUserId,
      feedbackId,
    });

    return { alreadySubscribed: false, subscribed: true };
  },
});

/**
 * Unsubscribe from feedback updates via public API
 */
export const unsubscribeFeedbackByOrganization = internalMutation({
  args: {
    externalUserId: v.id("externalUsers"),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
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
    externalUserId: v.id("externalUsers"),
    feedbackId: v.id("feedback"),
    importance: v.number(), // 1-4 scale
    organizationId: v.id("organizations"),
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
