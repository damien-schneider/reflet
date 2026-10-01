import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isOrgMemberViewer } from "../shared/access";
import { isFeedbackPublishable } from "./property_values";

export const isFeedbackPubliclyVisible = (
  org: Doc<"organizations"> | null,
  feedback: Doc<"feedback">
): boolean => Boolean(org?.isPublic && isFeedbackPublishable(feedback));

export const canViewFeedback = async (
  ctx: QueryCtx,
  feedback: Doc<"feedback">
): Promise<boolean> => {
  if (await isOrgMemberViewer(ctx, feedback.organizationId)) {
    return true;
  }
  const org = await ctx.db.get(feedback.organizationId);
  return isFeedbackPubliclyVisible(org, feedback);
};

export const toPublicFeedback = (
  feedback: Doc<"feedback">
): Doc<"feedback"> => ({
  _creationTime: feedback._creationTime,
  _id: feedback._id,
  attachments: feedback.attachments,
  commentCount: feedback.commentCount,
  completedAt: feedback.completedAt,
  createdAt: feedback.createdAt,
  deletedAt: feedback.deletedAt,
  description: feedback.description,
  isApproved: feedback.isApproved,
  isMerged: feedback.isMerged,
  isPinned: feedback.isPinned,
  mergedIntoId: feedback.mergedIntoId,
  organizationId: feedback.organizationId,
  organizationStatusId: feedback.organizationStatusId,
  roadmapOrder: feedback.roadmapOrder,
  status: feedback.status,
  title: feedback.title,
  updatedAt: feedback.updatedAt,
  voteCount: feedback.voteCount,
});

export const projectFeedbackFor = (
  feedback: Doc<"feedback">,
  isMember: boolean
): Doc<"feedback"> => (isMember ? feedback : toPublicFeedback(feedback));
