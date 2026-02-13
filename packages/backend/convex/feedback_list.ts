import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

// Helper to sort feedback
const sortFeedback = <
  T extends {
    voteCount: number;
    createdAt: number;
    commentCount: number;
    isPinned: boolean;
  },
>(
  items: T[],
  sortBy: "votes" | "newest" | "oldest" | "comments"
): T[] => {
  const sorted = [...items];
  switch (sortBy) {
    case "votes":
      sorted.sort((a, b) => b.voteCount - a.voteCount);
      break;
    case "newest":
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "oldest":
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case "comments":
      sorted.sort((a, b) => b.commentCount - a.commentCount);
      break;
    default:
      break;
  }
  // Pinned items first
  sorted.sort((a, b) => {
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }
    return 0;
  });
  return sorted;
};

/**
 * List feedback for an organization with filtering and sorting
 */
export const listByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    statusIds: v.optional(v.array(v.id("organizationStatuses"))),
    tagIds: v.optional(v.array(v.id("tags"))),
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
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || org.isPublic)) {
      return [];
    }

    // Get all organization statuses for enrichment
    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const statusMap = new Map(orgStatuses.map((s) => [s._id, s]));

    // Get all feedback for the organization (excluding soft-deleted)
    let feedbackItems = (
      await ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect()
    ).filter((f) => !f.deletedAt);

    // Filter by statusIds (any of the selected statuses)
    if (args.statusIds && args.statusIds.length > 0) {
      const statusIdSet = new Set(args.statusIds as string[]);
      feedbackItems = feedbackItems.filter(
        (f) =>
          f.organizationStatusId &&
          statusIdSet.has(f.organizationStatusId as string)
      );
    }

    // Filter non-approved for non-members
    if (!isMember) {
      feedbackItems = feedbackItems.filter((f) => f.isApproved);
    }

    // Filter by tags (any of the selected tags - "or" semantics)
    if (args.tagIds && args.tagIds.length > 0) {
      const selectedTagIds = new Set(args.tagIds as string[]);
      const feedbackWithTags = await Promise.all(
        feedbackItems.map(async (f) => {
          const tags = await ctx.db
            .query("feedbackTags")
            .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
            .collect();
          const tagIds = tags.map((t) => t.tagId as string);
          // Check if feedback has ANY of the selected tags
          const hasAnyTag = tagIds.some((tagId) => selectedTagIds.has(tagId));
          return hasAnyTag ? f : null;
        })
      );
      feedbackItems = feedbackWithTags.filter(Boolean) as typeof feedbackItems;
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
    feedbackItems = sortFeedback(feedbackItems, args.sortBy ?? "votes");

    // Limit
    if (args.limit) {
      feedbackItems = feedbackItems.slice(0, args.limit);
    }

    // Enrich with org status info and user vote status
    const enrichFeedback = async (f: (typeof feedbackItems)[0]) => {
      // Get tags
      const feedbackTags = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
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

      // Get all votes
      const allVotes = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
        .collect();

      const upvoteCount = allVotes.filter(
        (v) => v.voteType === "upvote"
      ).length;
      const downvoteCount = allVotes.filter(
        (v) => v.voteType === "downvote"
      ).length;

      // Get user vote status
      let hasVoted = false;
      let userVoteType: "upvote" | "downvote" | null = null;
      if (user) {
        const userVote = allVotes.find((v) => v.userId === user._id);
        hasVoted = !!userVote;
        userVoteType = userVote?.voteType ?? null;
      }

      // Get organization status info
      const orgStatus = f.organizationStatusId
        ? statusMap.get(f.organizationStatusId)
        : null;

      return {
        ...f,
        hasVoted,
        userVoteType,
        upvoteCount,
        downvoteCount,
        tags: tags.filter(Boolean),
        organizationStatus: orgStatus
          ? {
              name: orgStatus.name,
              color: orgStatus.color,
              icon: orgStatus.icon,
            }
          : null,
      };
    };

    return Promise.all(feedbackItems.map(enrichFeedback));
  },
});

/**
 * List feedback for roadmap view - organization-based
 */
export const listForRoadmapByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || org.isPublic)) {
      return [];
    }

    // Get all feedback for the organization (excluding soft-deleted)
    let feedbackItems = (
      await ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect()
    ).filter((f) => !f.deletedAt);

    // Filter to only approved items for non-members
    feedbackItems = isMember
      ? feedbackItems
      : feedbackItems.filter((f) => f.isApproved);

    // Filter by tags (any of the selected tags - "or" semantics)
    if (args.tagIds && args.tagIds.length > 0) {
      const selectedTagIds = new Set(args.tagIds as string[]);
      const feedbackWithTags = await Promise.all(
        feedbackItems.map(async (f) => {
          const tags = await ctx.db
            .query("feedbackTags")
            .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
            .collect();
          const tagIds = tags.map((t) => t.tagId as string);
          const hasAnyTag = tagIds.some((tagId) => selectedTagIds.has(tagId));
          return hasAnyTag ? f : null;
        })
      );
      feedbackItems = feedbackWithTags.filter(Boolean) as typeof feedbackItems;
    }

    // Add vote status and tags
    const feedbackWithDetails = await Promise.all(
      feedbackItems.map(async (f) => {
        // Get tags
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const tags = await Promise.all(
          feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
        );

        // Get organization status
        const orgStatus = f.organizationStatusId
          ? await ctx.db.get(f.organizationStatusId)
          : null;

        // Get all votes for this feedback
        const allVotes = await ctx.db
          .query("feedbackVotes")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();

        const upvoteCount = allVotes.filter(
          (v) => v.voteType === "upvote"
        ).length;
        const downvoteCount = allVotes.filter(
          (v) => v.voteType === "downvote"
        ).length;

        // Check if user voted
        let hasVoted = false;
        let userVoteType: "upvote" | "downvote" | null = null;
        if (user) {
          const userVote = allVotes.find((v) => v.userId === user._id);
          hasVoted = !!userVote;
          userVoteType = userVote?.voteType ?? null;
        }

        // Get milestones linked to this feedback
        const milestoneFeedbackLinks = await ctx.db
          .query("milestoneFeedback")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const milestones = (
          await Promise.all(
            milestoneFeedbackLinks.map(async (mf) => ctx.db.get(mf.milestoneId))
          )
        ).filter(
          (m): m is NonNullable<typeof m> => m !== null && m !== undefined
        );

        return {
          ...f,
          tags: tags.filter(Boolean),
          organizationStatus: orgStatus
            ? {
                name: orgStatus.name,
                color: orgStatus.color,
                icon: orgStatus.icon,
              }
            : null,
          hasVoted,
          userVoteType,
          upvoteCount,
          downvoteCount,
          milestones: milestones.map((m) => ({
            _id: m._id,
            name: m.name,
            emoji: m.emoji,
          })),
        };
      })
    );

    return feedbackWithDetails;
  },
});
