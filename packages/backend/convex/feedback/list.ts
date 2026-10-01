import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getFeedbackCategories } from "./categories/visibility";
import {
  isFeedbackPubliclyVisible,
  projectFeedbackFor,
} from "./public_projection";
import { isFinishedStatus } from "./status_utils";

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

export const listByOrganization = query({
  args: {
    hideCompleted: v.optional(v.boolean()),
    limit: v.optional(v.number()),
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
    statusIds: v.optional(v.array(v.id("organizationStatuses"))),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    const user = await authComponent.safeGetAuthUser(ctx);

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

    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const statusMap = new Map(orgStatuses.map((s) => [s._id, s]));

    let feedbackItems = (
      await ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect()
    ).filter((f) => !(f.deletedAt || f.isMerged));

    if (args.statusIds && args.statusIds.length > 0) {
      const statusIdSet = new Set<string>(args.statusIds);
      feedbackItems = feedbackItems.filter(
        (f) => f.organizationStatusId && statusIdSet.has(f.organizationStatusId)
      );
    }

    if (args.hideCompleted) {
      feedbackItems = feedbackItems.filter((f) => !isFinishedStatus(f.status));
    }

    if (!isMember) {
      feedbackItems = feedbackItems.filter((f) =>
        isFeedbackPubliclyVisible(org, f)
      );
    }

    if (args.tagIds && args.tagIds.length > 0) {
      const selectedTagIds = new Set<string>(args.tagIds);
      const feedbackWithTags = await Promise.all(
        feedbackItems.map(async (f) => {
          const tags = await getFeedbackCategories(ctx, f._id, isMember);
          const tagIds = tags.map((tag) => tag._id);

          const hasAnyTag = tagIds.some((tagId) => selectedTagIds.has(tagId));
          return hasAnyTag ? f : null;
        })
      );
      feedbackItems = feedbackWithTags.filter(
        (item): item is NonNullable<typeof item> => item !== null
      );
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      feedbackItems = feedbackItems.filter(
        (f) =>
          f.title.toLowerCase().includes(searchLower) ||
          f.description.toLowerCase().includes(searchLower)
      );
    }

    feedbackItems = sortFeedback(feedbackItems, args.sortBy ?? "votes");

    if (args.limit) {
      feedbackItems = feedbackItems.slice(0, args.limit);
    }

    const enrichFeedback = async (f: (typeof feedbackItems)[0]) => {
      const tags = await getFeedbackCategories(ctx, f._id, isMember);

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

      let hasVoted = false;
      let userVoteType: "upvote" | "downvote" | null = null;
      if (user) {
        const userVote = allVotes.find((v) => v.userId === user._id);
        hasVoted = !!userVote;
        userVoteType = userVote?.voteType ?? null;
      }

      const orgStatus = f.organizationStatusId
        ? statusMap.get(f.organizationStatusId)
        : null;

      return {
        ...projectFeedbackFor(f, isMember),
        assignee:
          isMember && f.assigneeId
            ? await authComponent
                .getAnyUserById(ctx, f.assigneeId)
                .then((profile) =>
                  profile ? { name: profile.name ?? null } : null
                )
            : null,
        downvoteCount,
        hasVoted,
        isMember,
        organizationStatus: orgStatus
          ? {
              color: orgStatus.color,
              icon: orgStatus.icon,
              name: orgStatus.name,
            }
          : null,
        tags,
        upvoteCount,
        userVoteType,
      };
    };

    return Promise.all(feedbackItems.map(enrichFeedback));
  },
});
