import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import { afterApproval } from "./after_create";

export const holdForReview = internalMutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback?.isApproved) {
      return;
    }

    await ctx.db.patch(args.feedbackId, {
      isApproved: false,
      updatedAt: Date.now(),
    });
  },
});

export const releaseAfterTriage = internalMutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback?.isApproved) {
      return;
    }

    await afterApproval(ctx, feedback);
  },
});

export const listPendingReview = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const access = await requireOrgMember(ctx, args.organizationId);

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_org_approved", (q) =>
        q.eq("organizationId", args.organizationId).eq("isApproved", false)
      )
      .collect();

    const items = feedbackItems
      .filter((feedback) => !(feedback.deletedAt || feedback.isMerged))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((feedback) => ({
        _id: feedback._id,
        aiUsefulness: feedback.aiUsefulness,
        createdAt: feedback.createdAt,
        description: feedback.description,
        source: feedback.source,
        title: feedback.title,
      }));

    return { canApprove: access.isAdmin, items };
  },
});
