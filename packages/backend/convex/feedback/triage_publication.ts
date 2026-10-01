import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { afterApproval } from "./after_create";
import { publicationState } from "./property_values";

function describeDecision(options: {
  canModerate: boolean;
  withhold: boolean;
  isApproved: boolean;
  feedback: Doc<"feedback">;
}) {
  if (!options.canModerate) {
    return `Preserved ${publicationState(options.feedback)}; human audience and approval decisions are preserved`;
  }
  if (options.withhold) {
    return "Held pending for publication review; JEV suggests rejection";
  }
  if (options.isApproved) {
    return "Automatically approved under the project publication policy";
  }
  return "Kept pending; the project requires human publication approval";
}

export async function decidePublication(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  options: { run: Doc<"feedbackTriageRuns">; withhold: boolean }
) {
  const canModerate =
    options.run.applyModeration &&
    !feedback.isInternal &&
    feedback.publicationReviewedAt === undefined;
  const organization = await ctx.db.get(feedback.organizationId);
  const isApproved = canModerate
    ? !(options.withhold || organization?.feedbackSettings?.requireApproval)
    : feedback.isApproved;
  return {
    decision: describeDecision({
      canModerate,
      feedback,
      isApproved,
      withhold: options.withhold,
    }),
    isApproved,
  };
}

export async function applyPolicyWithoutVerdict(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  run: Doc<"feedbackTriageRuns">
) {
  const { decision, isApproved } = await decidePublication(ctx, feedback, {
    run,
    withhold: false,
  });
  if (isApproved !== feedback.isApproved) {
    await ctx.db.patch(feedback._id, { isApproved, updatedAt: Date.now() });
    if (isApproved) {
      await afterApproval(ctx, { ...feedback, isApproved });
    }
  }
  return decision;
}

export async function retriageEditedSubmission(
  ctx: MutationCtx,
  run: Doc<"feedbackTriageRuns">
) {
  if (!run.applyModeration) {
    return;
  }
  await ctx.scheduler.runAfter(
    0,
    internal.feedback.auto_tagging_actions.processAutoTagging,
    { feedbackId: run.feedbackId }
  );
}
