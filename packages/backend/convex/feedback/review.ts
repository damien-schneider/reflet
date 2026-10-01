import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import { publicationState } from "./property_values";

export const collectPendingReview = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
) => {
  const feedbackItems = await ctx.db
    .query("feedback")
    .withIndex("by_org_approved", (q) =>
      q.eq("organizationId", organizationId).eq("isApproved", false)
    )
    .collect();

  return feedbackItems
    .filter(
      (feedback) =>
        !(feedback.deletedAt || feedback.isMerged) &&
        publicationState(feedback) === "pending"
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((feedback) => ({
      _id: feedback._id,
      aiJunk: feedback.aiJunk,
      aiNeedsReview: feedback.aiNeedsReview,
      aiUsefulness: feedback.aiUsefulness,
      createdAt: feedback.createdAt,
      description: feedback.description,
      needsClarification: feedback.needsClarification,
      source: feedback.source,
      title: feedback.title,
    }));
};

export const listPendingReview = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const access = await requireOrgMember(ctx, args.organizationId);

    return {
      canApprove: access.isAdmin,
      items: await collectPendingReview(ctx, args.organizationId),
    };
  },
});
