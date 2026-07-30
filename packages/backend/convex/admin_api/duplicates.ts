import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { feedbackStatus } from "../shared/validators";

export const listPendingDuplicates = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const pairs = await ctx.db
      .query("duplicatePairs")
      .withIndex("by_organization_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const pairsWithFeedback = await Promise.all(
      pairs.map(async (pair) => {
        const feedbackA = await ctx.db.get(pair.feedbackIdA);
        const feedbackB = await ctx.db.get(pair.feedbackIdB);
        if (!(feedbackA && feedbackB)) {
          return null;
        }
        return {
          _id: pair._id,
          detectedAt: pair.detectedAt,
          feedbackA: {
            _id: feedbackA._id,
            description: feedbackA.description.slice(0, 200),
            status: feedbackA.status,
            title: feedbackA.title,
            voteCount: feedbackA.voteCount,
          },
          feedbackB: {
            _id: feedbackB._id,
            description: feedbackB.description.slice(0, 200),
            status: feedbackB.status,
            title: feedbackB.title,
            voteCount: feedbackB.voteCount,
          },
          similarityScore: pair.similarityScore,
        };
      })
    );

    return pairsWithFeedback.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("duplicatePairs"),
      detectedAt: v.number(),
      feedbackA: v.object({
        _id: v.id("feedback"),
        description: v.string(),
        status: feedbackStatus,
        title: v.string(),
        voteCount: v.number(),
      }),
      feedbackB: v.object({
        _id: v.id("feedback"),
        description: v.string(),
        status: feedbackStatus,
        title: v.string(),
        voteCount: v.number(),
      }),
      similarityScore: v.number(),
    })
  ),
});

export const resolveDuplicate = internalMutation({
  args: {
    action: v.union(v.literal("confirm"), v.literal("reject")),
    pairId: v.id("duplicatePairs"),
    resolvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const pair = await ctx.db.get(args.pairId);
    if (!pair) {
      throw new Error("Duplicate pair not found");
    }

    await ctx.db.patch(args.pairId, {
      resolvedAt: Date.now(),
      resolvedBy: args.resolvedBy,
      status: args.action === "confirm" ? "confirmed" : "rejected",
    });

    return null;
  },
  returns: v.null(),
});

export const mergeFeedback = internalMutation({
  args: {
    mergedBy: v.string(),
    pairId: v.optional(v.id("duplicatePairs")),
    sourceFeedbackId: v.id("feedback"),
    targetFeedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceFeedbackId);
    const target = await ctx.db.get(args.targetFeedbackId);

    if (!(source && target)) {
      throw new Error("Feedback not found");
    }

    if (source.organizationId !== target.organizationId) {
      throw new Error("Cannot merge feedback from different organizations");
    }

    // Transfer votes
    const sourceVotes = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback", (q) =>
        q.eq("feedbackId", args.sourceFeedbackId)
      )
      .collect();

    for (const vote of sourceVotes) {
      const existingVote = vote.userId
        ? await ctx.db
            .query("feedbackVotes")
            .withIndex("by_feedback_user", (q) =>
              q
                .eq("feedbackId", args.targetFeedbackId)
                .eq("userId", vote.userId as string)
            )
            .first()
        : null;

      if (!existingVote) {
        await ctx.db.insert("feedbackVotes", {
          createdAt: vote.createdAt,
          externalUserId: vote.externalUserId,
          feedbackId: args.targetFeedbackId,
          userId: vote.userId,
          voteType: vote.voteType,
        });
      }
    }

    // Transfer subscriptions
    const sourceSubscriptions = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback", (q) =>
        q.eq("feedbackId", args.sourceFeedbackId)
      )
      .collect();

    for (const sub of sourceSubscriptions) {
      const existingSub = sub.userId
        ? await ctx.db
            .query("feedbackSubscriptions")
            .withIndex("by_feedback_user", (q) =>
              q
                .eq("feedbackId", args.targetFeedbackId)
                .eq("userId", sub.userId as string)
            )
            .first()
        : null;

      if (!existingSub) {
        await ctx.db.insert("feedbackSubscriptions", {
          createdAt: sub.createdAt,
          externalUserId: sub.externalUserId,
          feedbackId: args.targetFeedbackId,
          userId: sub.userId,
        });
      }
    }

    // Recount votes on target
    const targetVotes = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback", (q) =>
        q.eq("feedbackId", args.targetFeedbackId)
      )
      .collect();

    const upvotes = targetVotes.filter((v) => v.voteType === "upvote").length;
    const downvotes = targetVotes.filter(
      (v) => v.voteType === "downvote"
    ).length;

    await ctx.db.patch(args.targetFeedbackId, {
      updatedAt: Date.now(),
      voteCount: upvotes - downvotes,
    });

    // Record merge history
    await ctx.db.insert("mergeHistory", {
      mergedAt: Date.now(),
      mergedBy: args.mergedBy,
      organizationId: source.organizationId,
      sourceDescription: source.description,
      sourceFeedbackId: args.sourceFeedbackId,
      sourceStatus: source.status,
      sourceTitle: source.title,
      sourceVoteCount: source.voteCount,
      targetFeedbackId: args.targetFeedbackId,
    });

    // Mark source as merged
    await ctx.db.patch(args.sourceFeedbackId, {
      isMerged: true,
      mergedIntoId: args.targetFeedbackId,
      updatedAt: Date.now(),
    });

    // Update pair status if provided
    if (args.pairId) {
      await ctx.db.patch(args.pairId, {
        resolvedAt: Date.now(),
        resolvedBy: args.mergedBy,
        status: "merged",
      });
    }

    return null;
  },
  returns: v.null(),
});
