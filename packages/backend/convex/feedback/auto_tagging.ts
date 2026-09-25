import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx, query } from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import { triageScopeValidator } from "./triage_scope";

const partitionForTriage = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
) => {
  const feedbackItems = await ctx.db
    .query("feedback")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();

  const live: Doc<"feedback">[] = [];
  const untriaged: Doc<"feedback">[] = [];

  for (const feedback of feedbackItems) {
    if (feedback.deletedAt || feedback.isMerged) {
      continue;
    }

    live.push(feedback);

    if (feedback.aiUsefulnessGeneratedAt) {
      continue;
    }

    const tag = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
      .first();

    if (!tag) {
      untriaged.push(feedback);
    }
  }

  return { live, untriaged };
};

export const getTriageCounts = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const { live, untriaged } = await partitionForTriage(
      ctx,
      args.organizationId
    );

    return { all: live.length, untriaged: untriaged.length };
  },
});

export const getRecentTriageResults = query({
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

    const recentlyTriaged = feedbackItems.filter(
      (f) =>
        !(f.deletedAt || f.isMerged) &&
        f.aiUsefulnessGeneratedAt &&
        f.aiUsefulnessGeneratedAt >= args.since
    );

    const triageResults = await Promise.all(
      recentlyTriaged.map(async (f) => {
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
          tags: tags.filter(Boolean),
          title: f.title,
        };
      })
    );

    return triageResults;
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

    const sortedJobs = jobs.sort((a, b) => b.startedAt - a.startedAt);
    const mostRecentJob = sortedJobs[0];

    if (!mostRecentJob) {
      return null;
    }

    if (
      mostRecentJob.status === "pending" ||
      mostRecentJob.status === "processing"
    ) {
      return mostRecentJob;
    }

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

export const getFeedbackIdsForTriage = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    scope: triageScopeValidator,
  },
  handler: async (ctx, args): Promise<Id<"feedback">[]> => {
    const { live, untriaged } = await partitionForTriage(
      ctx,
      args.organizationId
    );

    const targets = args.scope === "all" ? live : untriaged;

    return targets.map((feedback) => feedback._id);
  },
});
