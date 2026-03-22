import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalQuery } from "../_generated/server";

export const getShippedNotificationData = internalQuery({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      return null;
    }

    const org = await ctx.db.get(release.organizationId);
    if (!org) {
      return null;
    }

    const links = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    const feedbackItems: Array<{ feedbackId: string; feedbackTitle: string }> =
      [];

    for (const link of links) {
      const feedback = await ctx.db.get(link.feedbackId);
      if (feedback && !feedback.deletedAt) {
        feedbackItems.push({
          feedbackId: feedback._id,
          feedbackTitle: feedback.title,
        });
      }
    }

    return {
      releaseTitle: release.title,
      orgName: org.name,
      orgSlug: org.slug,
      isPro: org.subscriptionTier === "pro",
      feedbackItems,
    };
  },
});

export const getFeedbackRecipients = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const subs = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const userIds = new Set<string>();
    for (const vote of votes) {
      if (vote.userId) {
        userIds.add(vote.userId);
      }
    }
    for (const sub of subs) {
      if (sub.userId) {
        userIds.add(sub.userId);
      }
    }

    const recipients: { email: string; userId: string }[] = [];

    for (const userId of userIds) {
      const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "id", operator: "eq", value: userId }],
      })) as { email?: string } | null;
      if (user?.email) {
        recipients.push({ email: user.email, userId });
      }
    }

    return recipients;
  },
});
