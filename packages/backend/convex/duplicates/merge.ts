import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { feedbackStatus } from "../shared/validators";

export const getPendingDuplicates = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("duplicatePairs"),
      feedbackA: v.object({
        _id: v.id("feedback"),
        title: v.string(),
        description: v.string(),
        voteCount: v.number(),
        status: feedbackStatus,
      }),
      feedbackB: v.object({
        _id: v.id("feedback"),
        title: v.string(),
        description: v.string(),
        voteCount: v.number(),
        status: feedbackStatus,
      }),
      similarityScore: v.number(),
      detectedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

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
          feedbackA: {
            _id: feedbackA._id,
            title: feedbackA.title,
            description: feedbackA.description.slice(0, 200),
            voteCount: feedbackA.voteCount,
            status: feedbackA.status,
          },
          feedbackB: {
            _id: feedbackB._id,
            title: feedbackB.title,
            description: feedbackB.description.slice(0, 200),
            voteCount: feedbackB.voteCount,
            status: feedbackB.status,
          },
          similarityScore: pair.similarityScore,
          detectedAt: pair.detectedAt,
        };
      })
    );

    return pairsWithFeedback.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
  },
});

export const resolveDuplicate = mutation({
  args: {
    pairId: v.id("duplicatePairs"),
    action: v.union(v.literal("confirm"), v.literal("reject")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const pair = await ctx.db.get(args.pairId);

    if (!pair) {
      throw new Error("Duplicate pair not found");
    }

    await ctx.db.patch(args.pairId, {
      status: args.action === "confirm" ? "confirmed" : "rejected",
      resolvedAt: Date.now(),
      resolvedBy: user._id,
    });

    return null;
  },
});

export const mergeFeedback = mutation({
  args: {
    sourceFeedbackId: v.id("feedback"),
    targetFeedbackId: v.id("feedback"),
    pairId: v.optional(v.id("duplicatePairs")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const source = await ctx.db.get(args.sourceFeedbackId);
    const target = await ctx.db.get(args.targetFeedbackId);

    if (!(source && target)) {
      throw new Error("Feedback not found");
    }

    if (source.organizationId !== target.organizationId) {
      throw new Error("Cannot merge feedback from different organizations");
    }

    // Transfer votes from source to target
    const sourceVotes = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback", (q) =>
        q.eq("feedbackId", args.sourceFeedbackId)
      )
      .collect();

    for (const vote of sourceVotes) {
      // Check if user already voted on target
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
          feedbackId: args.targetFeedbackId,
          userId: vote.userId,
          voteType: vote.voteType,
          externalUserId: vote.externalUserId,
          createdAt: vote.createdAt,
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
          feedbackId: args.targetFeedbackId,
          userId: sub.userId,
          externalUserId: sub.externalUserId,
          createdAt: sub.createdAt,
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
      voteCount: upvotes - downvotes,
      updatedAt: Date.now(),
    });

    // Record merge history
    await ctx.db.insert("mergeHistory", {
      organizationId: source.organizationId,
      sourceFeedbackId: args.sourceFeedbackId,
      targetFeedbackId: args.targetFeedbackId,
      mergedBy: user._id,
      mergedAt: Date.now(),
      sourceTitle: source.title,
      sourceDescription: source.description,
      sourceVoteCount: source.voteCount,
      sourceStatus: source.status,
    });

    // Mark source as merged
    await ctx.db.patch(args.sourceFeedbackId, {
      isMerged: true,
      mergedIntoId: args.targetFeedbackId,
      updatedAt: Date.now(),
    });

    // Update duplicate pair status if provided
    if (args.pairId) {
      await ctx.db.patch(args.pairId, {
        status: "merged",
        resolvedAt: Date.now(),
        resolvedBy: user._id,
      });
    }

    return null;
  },
});

export const getMergeHistory = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("mergeHistory"),
      sourceTitle: v.string(),
      targetFeedbackId: v.id("feedback"),
      mergedAt: v.number(),
      sourceVoteCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const history = await ctx.db
      .query("mergeHistory")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);

    return history.map((h) => ({
      _id: h._id,
      sourceTitle: h.sourceTitle,
      targetFeedbackId: h.targetFeedbackId,
      mergedAt: h.mergedAt,
      sourceVoteCount: h.sourceVoteCount,
    }));
  },
});
