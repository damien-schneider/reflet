import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { changeFeedbackStatus } from "../feedback/status_change";
import type { FeedbackStatusValue } from "../shared/validators";

export async function applyReleaseStatus(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  status: FeedbackStatusValue | undefined,
  actorId: string
): Promise<void> {
  if (!status) {
    return;
  }
  await changeFeedbackStatus(ctx, feedback, {
    actorId,
    source: "release",
    status,
  });
}

export async function applyReleaseStatusToLinkedFeedback(
  ctx: MutationCtx,
  releaseId: Id<"releases">,
  status: FeedbackStatusValue,
  actorId: string
): Promise<void> {
  const links = await ctx.db
    .query("releaseFeedback")
    .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
    .collect();
  for (const link of links) {
    const feedback = await ctx.db.get(link.feedbackId);
    if (feedback) {
      await applyReleaseStatus(ctx, feedback, status, actorId);
    }
  }
}
