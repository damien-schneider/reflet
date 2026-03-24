import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const getFeedbackForComparison = internalQuery({
  args: { feedbackId: v.id("feedback") },
  returns: v.union(
    v.object({
      _id: v.id("feedback"),
      organizationId: v.id("organizations"),
      title: v.string(),
      description: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.isMerged || feedback.deletedAt) {
      return null;
    }
    return {
      _id: feedback._id,
      organizationId: feedback.organizationId,
      title: feedback.title,
      description: feedback.description,
    };
  },
});

export const searchSimilarByTitle = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    excludeId: v.id("feedback"),
    limit: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("feedback"),
      title: v.string(),
      description: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("feedback")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.title).eq("organizationId", args.organizationId)
      )
      .take(args.limit + 1);

    return results
      .filter((f) => f._id !== args.excludeId && !f.isMerged && !f.deletedAt)
      .slice(0, args.limit)
      .map((f) => ({
        _id: f._id,
        title: f.title,
        description: f.description,
      }));
  },
});

export const createDuplicatePair = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackIdA: v.id("feedback"),
    feedbackIdB: v.id("feedback"),
    similarityScore: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingA = await ctx.db
      .query("duplicatePairs")
      .withIndex("by_feedback_a", (q) => q.eq("feedbackIdA", args.feedbackIdA))
      .collect();

    const alreadyPaired = existingA.some(
      (p) => p.feedbackIdB === args.feedbackIdB
    );

    if (alreadyPaired) {
      return null;
    }

    const existingB = await ctx.db
      .query("duplicatePairs")
      .withIndex("by_feedback_a", (q) => q.eq("feedbackIdA", args.feedbackIdB))
      .collect();

    const reversePaired = existingB.some(
      (p) => p.feedbackIdB === args.feedbackIdA
    );

    if (reversePaired) {
      return null;
    }

    await ctx.db.insert("duplicatePairs", {
      organizationId: args.organizationId,
      feedbackIdA: args.feedbackIdA,
      feedbackIdB: args.feedbackIdB,
      similarityScore: args.similarityScore,
      status: "pending",
      detectedAt: Date.now(),
    });

    return null;
  },
});
