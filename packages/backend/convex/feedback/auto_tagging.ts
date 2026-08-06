import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, query } from "../_generated/server";
import { requireOrgMember } from "../shared/access";

export const getUntaggedFeedbackCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    let untaggedCount = 0;
    for (const feedback of feedbackItems) {
      // Skip deleted or merged feedback
      if (feedback.deletedAt || feedback.isMerged) {
        continue;
      }

      // Skip items that have already been AI-analyzed
      if (feedback.aiPriorityGeneratedAt) {
        continue;
      }

      const tags = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .first();

      if (!tags) {
        untaggedCount++;
      }
    }

    return untaggedCount;
  },
});

export const getRecentlyTaggedItems = query({
  args: {
    organizationId: v.id("organizations"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter to items that were AI-analyzed after the given timestamp, excluding deleted/merged
    const recentlyTagged = feedbackItems.filter(
      (f) =>
        !(f.deletedAt || f.isMerged) &&
        f.aiPriorityGeneratedAt &&
        f.aiPriorityGeneratedAt >= args.since
    );

    // Get tags for each item
    const itemsWithTags = await Promise.all(
      recentlyTagged.map(async (f) => {
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();

        const tags = await Promise.all(
          feedbackTags
            .filter((ft) => ft.appliedByAi)
            .map(async (ft) => {
              const tag = await ctx.db.get(ft.tagId);
              return tag
                ? { _id: tag._id, color: tag.color, name: tag.name }
                : null;
            })
        );

        return {
          _id: f._id,
          aiComplexity: f.aiComplexity,
          aiPriority: f.aiPriority,
          aiTimeEstimate: f.aiTimeEstimate,
          tags: tags.filter(Boolean),
          title: f.title,
        };
      })
    );

    return itemsWithTags;
  },
});

export const getActiveJob = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const jobs = await ctx.db
      .query("autoTaggingJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (jobs.length === 0) {
      return null;
    }

    // Sort by startedAt descending
    const sortedJobs = jobs.sort((a, b) => b.startedAt - a.startedAt);
    const mostRecentJob = sortedJobs[0];

    if (!mostRecentJob) {
      return null;
    }

    // Return active jobs immediately
    if (
      mostRecentJob.status === "pending" ||
      mostRecentJob.status === "processing"
    ) {
      return mostRecentJob;
    }

    // Return recently completed/failed jobs (within 10 seconds)
    const tenSecondsAgo = Date.now() - 10_000;
    if (
      mostRecentJob.completedAt &&
      mostRecentJob.completedAt > tenSecondsAgo
    ) {
      return mostRecentJob;
    }

    return null;
  },
});

export const getFeedbackForAutoTagging = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.deletedAt || feedback.isMerged) {
      return null;
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .collect();

    return {
      feedback,
      tags,
    };
  },
});

export const getUntaggedFeedbackIds = internalQuery({
  args: {
    limit: v.optional(v.number()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Id<"feedback">[]> => {
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const untaggedIds: Id<"feedback">[] = [];

    for (const feedback of feedbackItems) {
      // Skip deleted or merged feedback
      if (feedback.deletedAt || feedback.isMerged) {
        continue;
      }

      // Skip items that have already been AI-analyzed
      if (feedback.aiPriorityGeneratedAt) {
        continue;
      }

      const tag = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .first();

      if (!tag) {
        untaggedIds.push(feedback._id);
        if (args.limit && untaggedIds.length >= args.limit) {
          break;
        }
      }
    }

    return untaggedIds;
  },
});
