import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const getFeedbackForComparison = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.isMerged || feedback.deletedAt) {
      return null;
    }
    return {
      _id: feedback._id,
      description: feedback.description,
      organizationId: feedback.organizationId,
      title: feedback.title,
    };
  },
  returns: v.union(
    v.object({
      _id: v.id("feedback"),
      description: v.string(),
      organizationId: v.id("organizations"),
      title: v.string(),
    }),
    v.null()
  ),
});

export const searchSimilarByTitle = internalQuery({
  args: {
    excludeId: v.id("feedback"),
    limit: v.number(),
    organizationId: v.id("organizations"),
    title: v.string(),
  },
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
        description: f.description,
        title: f.title,
      }));
  },
  returns: v.array(
    v.object({
      _id: v.id("feedback"),
      description: v.string(),
      title: v.string(),
    })
  ),
});

export const createDuplicatePair = internalMutation({
  args: {
    feedbackIdA: v.id("feedback"),
    feedbackIdB: v.id("feedback"),
    organizationId: v.id("organizations"),
    similarityScore: v.number(),
  },
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
      detectedAt: Date.now(),
      feedbackIdA: args.feedbackIdA,
      feedbackIdB: args.feedbackIdB,
      organizationId: args.organizationId,
      similarityScore: args.similarityScore,
      status: "pending",
    });

    return null;
  },
  returns: v.null(),
});
