import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

const feedbackStatus = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("closed")
);

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
      id: org._id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      primaryColor: org.primaryColor,
      isPublic: org.isPublic,
      feedbackSettings: org.feedbackSettings,
      statuses: statuses.map((s) => ({
        id: s._id,
        name: s.name,
        color: s.color,
        icon: s.icon,
        order: s.order,
      })),
      tags: publicTags.map((t) => ({
        id: t._id,
        name: t.name,
        slug: t.slug,
        color: t.color,
        description: t.description,
      })),
    };
  },
});

/**
 * List feedback by organization for public API
 */
export const listFeedbackByOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    statusId: v.optional(v.id("organizationStatuses")),
    tagId: v.optional(v.id("tags")),
    status: v.optional(feedbackStatus),
    search: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal("votes"),
        v.literal("newest"),
        v.literal("oldest"),
        v.literal("comments")
      )
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    externalUserId: v.optional(v.id("externalUsers")),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return { items: [], total: 0, hasMore: false };
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
                  id: tag._id,
                  name: tag.name,
                  slug: tag.slug,
                  color: tag.color,
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
              name: extUser.name,
              email: extUser.email,
              avatar: extUser.avatar,
              isExternal: true,
            };
          }
        }

        return {
          id: f._id,
          title: f.title,
          description: f.description,
          status: f.status,
          voteCount: f.voteCount,
          commentCount: f.commentCount,
          isPinned: f.isPinned,
          hasVoted,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          completedAt: f.completedAt,
          tags: tags.filter(Boolean),
          organizationStatus: orgStatus
            ? {
                id: orgStatus._id,
                name: orgStatus.name,
                color: orgStatus.color,
              }
            : null,
          author,
        };
      })
    );

    return {
      items,
      total,
      hasMore: offset + limit < total,
    };
  },
});
