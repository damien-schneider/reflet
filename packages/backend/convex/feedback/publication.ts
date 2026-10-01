import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import { afterApproval } from "./after_create";
import { archiveFeedback } from "./archive_feedback";
import {
  isFeedbackPublishable,
  type PublicationState,
  publicationState,
} from "./property_values";

export const publicationStateValidator = v.union(
  v.literal("internal"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

export async function changePublication(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  decision: { state: PublicationState; actorId: string }
) {
  const now = Date.now();
  const updated = {
    ...feedback,
    isApproved: decision.state === "approved",
    isInternal: decision.state === "internal" || undefined,
    publicationRejectedAt: decision.state === "rejected" ? now : undefined,
    publicationReviewedAt: now,
    publicationReviewedBy: decision.actorId,
    updatedAt: now,
  };
  await ctx.db.patch(feedback._id, {
    isApproved: updated.isApproved,
    isInternal: updated.isInternal,
    publicationRejectedAt: updated.publicationRejectedAt,
    publicationReviewedAt: now,
    publicationReviewedBy: decision.actorId,
    updatedAt: now,
  });
  if (decision.state === "rejected") {
    await archiveFeedback(ctx, feedback._id);
  }
  await ctx.db.insert("activityLogs", {
    action: "publication_changed",
    authorId: decision.actorId,
    createdAt: now,
    details: JSON.stringify({
      current: decision.state,
      previous: publicationState(feedback),
    }),
    feedbackId: feedback._id,
    organizationId: feedback.organizationId,
  });
  if (isFeedbackPublishable(updated) && !isFeedbackPublishable(feedback)) {
    await afterApproval(ctx, updated);
  }
}

export const setState = mutation({
  args: { feedbackId: v.id("feedback"), state: publicationStateValidator },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.deletedAt) {
      throw new Error("Feedback not found");
    }
    const { user } = await requireOrgAdmin(
      ctx,
      feedback.organizationId,
      "change publication"
    );
    await changePublication(ctx, feedback, {
      actorId: user._id,
      state: args.state,
    });
    return null;
  },
  returns: v.null(),
});
