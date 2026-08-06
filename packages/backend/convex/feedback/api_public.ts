import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

const DEFAULT_CHANGELOG_LIMIT = 20;
const MAX_SIMILAR_RESULTS = 5;
const MIN_SIMILAR_TITLE_LENGTH = 3;
const WHITESPACE_REGEX = /\s+/g;

export const getOrganizationConfig = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    const statuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    statuses.sort((a, b) => a.order - b.order);

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

export const listCommentsByOrganization = internalQuery({
  args: {
    feedbackId: v.id("feedback"),
    includePrivateContext: v.optional(v.boolean()),
    organizationId: v.id("organizations"),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (
      !feedback ||
      feedback.organizationId !== args.organizationId ||
      !feedback.isApproved ||
      feedback.deletedAt
    ) {
      return [];
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    if ((args.sortBy ?? "oldest") === "newest") {
      comments.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      comments.sort((a, b) => a.createdAt - b.createdAt);
    }

    const rootComments = comments.filter((c) => !c.parentId);
    const repliesMap = new Map<string, typeof comments>();

    for (const comment of comments) {
      if (comment.parentId) {
        const existing = repliesMap.get(comment.parentId) ?? [];
        existing.push(comment);
        repliesMap.set(comment.parentId, existing);
      }
    }

    const getAuthorInfo = async (comment: (typeof comments)[0]) => {
      if (comment.externalUserId) {
        const extUser = await ctx.db.get(comment.externalUserId);
        if (extUser) {
          return {
            avatar: extUser.avatar,
            email: args.includePrivateContext ? extUser.email : undefined,
            isExternal: true,
            name: extUser.name,
          };
        }
      }
      return null;
    };

    return await Promise.all(
      rootComments.map(async (comment) => {
        const author = await getAuthorInfo(comment);
        const replies = await Promise.all(
          (repliesMap.get(comment._id) ?? []).map(async (reply) => ({
            author: await getAuthorInfo(reply),
            body: reply.body,
            createdAt: reply.createdAt,
            id: reply._id,
            isOfficial: reply.isOfficial,
            updatedAt: reply.updatedAt,
          }))
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
  },
});

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

    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_org_order", (q) => q.eq("organizationId", organizationId))
      .collect();

    const sortedStatuses = orgStatuses.sort((a, b) => a.order - b.order);

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    const approvedFeedback = feedbackItems.filter(
      (f) => f.isApproved && !f.deletedAt && !f.isMerged
    );

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
      slug: status.name.toLowerCase().replace(WHITESPACE_REGEX, "-"),
    }));

    return { lanes };
  },
});

export const getChangelogByOrganization = internalQuery({
  args: {
    limit: v.optional(v.number()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { organizationId, limit = DEFAULT_CHANGELOG_LIMIT } = args;

    const org = await ctx.db.get(organizationId);
    if (!org) {
      return [];
    }

    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .filter((q) => q.neq(q.field("publishedAt"), undefined))
      .order("desc")
      .take(limit);

    return await Promise.all(
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
  },
});

export const searchSimilarFeedback = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.title.length < MIN_SIMILAR_TITLE_LENGTH) {
      return [];
    }

    const results = await ctx.db
      .query("feedback")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.title).eq("organizationId", args.organizationId)
      )
      .take(MAX_SIMILAR_RESULTS);

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
