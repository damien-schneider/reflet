import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";

const feedbackStatus = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("closed")
);

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

interface PublicAuthor {
  avatar: string | undefined;
  email: string | undefined;
  isExternal: boolean;
  name: string | undefined;
}

async function loadTags(ctx: QueryCtx, feedbackId: Id<"feedback">) {
  const feedbackTags = await ctx.db
    .query("feedbackTags")
    .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
    .collect();

  const tags = await Promise.all(
    feedbackTags.map(async (ft) => {
      const tag = await ctx.db.get(ft.tagId);
      return tag
        ? { color: tag.color, id: tag._id, name: tag.name, slug: tag.slug }
        : null;
    })
  );

  return tags.filter((tag): tag is NonNullable<typeof tag> => tag !== null);
}

async function loadAuthor(
  ctx: QueryCtx,
  externalUserId: Id<"externalUsers"> | undefined
): Promise<PublicAuthor | null> {
  if (!externalUserId) {
    return null;
  }
  const extUser = await ctx.db.get(externalUserId);
  if (!extUser) {
    return null;
  }
  return {
    avatar: extUser.avatar,
    email: extUser.email,
    isExternal: true,
    name: extUser.name,
  };
}

async function hasVotedOn(
  ctx: QueryCtx,
  feedbackId: Id<"feedback">,
  externalUserId: Id<"externalUsers"> | undefined
): Promise<boolean> {
  if (!externalUserId) {
    return false;
  }
  const vote = await ctx.db
    .query("feedbackVotes")
    .withIndex("by_feedback_external_user", (q) =>
      q.eq("feedbackId", feedbackId).eq("externalUserId", externalUserId)
    )
    .unique();
  return vote !== null;
}

function sortFeedback(
  items: Doc<"feedback">[],
  sortBy: "votes" | "newest" | "oldest" | "comments"
): void {
  switch (sortBy) {
    case "newest":
      items.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "oldest":
      items.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case "comments":
      items.sort((a, b) => b.commentCount - a.commentCount);
      break;
    default:
      items.sort((a, b) => b.voteCount - a.voteCount);
      break;
  }

  items.sort(
    (a, b) => Number(b.isPinned ?? false) - Number(a.isPinned ?? false)
  );
}

async function filterByTag(
  ctx: QueryCtx,
  items: Doc<"feedback">[],
  tagId: Id<"tags">
): Promise<Doc<"feedback">[]> {
  const matches = await Promise.all(
    items.map(async (f) => {
      const tags = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
        .collect();
      return tags.some((t) => t.tagId === tagId) ? f : null;
    })
  );
  return matches.filter((f): f is Doc<"feedback"> => f !== null);
}

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

    const all = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    let feedbackItems = all.filter(
      (f) => f.isApproved && !f.deletedAt && !f.isMerged
    );

    if (args.statusId) {
      feedbackItems = feedbackItems.filter(
        (f) => f.organizationStatusId === args.statusId
      );
    }

    if (args.status) {
      feedbackItems = feedbackItems.filter((f) => f.status === args.status);
    }

    if (args.tagId) {
      feedbackItems = await filterByTag(ctx, feedbackItems, args.tagId);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      feedbackItems = feedbackItems.filter(
        (f) =>
          f.title.toLowerCase().includes(searchLower) ||
          f.description.toLowerCase().includes(searchLower)
      );
    }

    sortFeedback(feedbackItems, args.sortBy ?? "votes");

    const total = feedbackItems.length;
    const offset = args.offset ?? 0;
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const page = feedbackItems.slice(offset, offset + limit);

    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const statusMap = new Map(orgStatuses.map((s) => [s._id, s]));

    const items = await Promise.all(
      page.map(async (f) => {
        const orgStatus = f.organizationStatusId
          ? statusMap.get(f.organizationStatusId)
          : null;

        return {
          author: await loadAuthor(ctx, f.externalUserId),
          commentCount: f.commentCount,
          completedAt: f.completedAt,
          createdAt: f.createdAt,
          description: f.description,
          hasVoted: await hasVotedOn(ctx, f._id, args.externalUserId),
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
          tags: await loadTags(ctx, f._id),
          title: f.title,
          updatedAt: f.updatedAt,
          voteCount: f.voteCount,
        };
      })
    );

    return { hasMore: offset + limit < total, items, total };
  },
});

export const getFeedbackByOrganization = internalQuery({
  args: {
    externalUserId: v.optional(v.id("externalUsers")),
    feedbackId: v.id("feedback"),
    includePrivateContext: v.optional(v.boolean()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    const isVisible =
      feedback &&
      !feedback.deletedAt &&
      feedback.organizationId === args.organizationId &&
      feedback.isApproved;

    if (!isVisible) {
      return null;
    }

    let organizationStatus: {
      color: string;
      id: Id<"organizationStatuses">;
      name: string;
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
      isSubscribed = subscription !== null;
    }

    return {
      assigneeId: args.includePrivateContext ? feedback.assigneeId : undefined,
      author: await loadAuthor(ctx, feedback.externalUserId),
      commentCount: feedback.commentCount,
      completedAt: feedback.completedAt,
      context: args.includePrivateContext ? feedback.context : undefined,
      createdAt: feedback.createdAt,
      description: feedback.description,
      hasVoted: await hasVotedOn(ctx, args.feedbackId, args.externalUserId),
      id: feedback._id,
      isPinned: feedback.isPinned,
      isSubscribed,
      organizationStatus,
      status: feedback.status,
      tags: await loadTags(ctx, args.feedbackId),
      title: feedback.title,
      updatedAt: feedback.updatedAt,
      voteCount: feedback.voteCount,
    };
  },
});
