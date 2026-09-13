import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { emitWebhookEvent } from "../webhooks/mutations";

export async function afterApproval(
  ctx: MutationCtx,
  feedback: Doc<"feedback">
): Promise<void> {
  await emitWebhookEvent(ctx, {
    event: "feedback.created",
    feedbackId: feedback._id,
    organizationId: feedback.organizationId,
  });

  if (feedback.githubIssueId) {
    return;
  }
  const connection = await ctx.db
    .query("githubConnections")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", feedback.organizationId)
    )
    .first();
  if (connection?.promoteTrigger === "on_create") {
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.issue_promote.promoteFeedback,
      { feedbackId: feedback._id, organizationId: feedback.organizationId }
    );
  }
}

export async function scheduleAfterCreate(
  ctx: MutationCtx,
  feedbackId: Id<"feedback">,
  options: { aiEnrichment: boolean; autoTagging: boolean }
): Promise<void> {
  await ctx.scheduler.runAfter(
    0,
    internal.duplicates.detection.findSimilarFeedback,
    { feedbackId }
  );
  if (options.autoTagging) {
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.auto_tagging_actions.processAutoTagging,
      { feedbackId }
    );
  }
  if (options.aiEnrichment) {
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.clarification.generateClarification,
      { feedbackId }
    );
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.draft_reply.generateDraftReplyAction,
      { feedbackId }
    );
  }

  const feedback = await ctx.db.get(feedbackId);
  if (feedback?.isApproved) {
    await afterApproval(ctx, feedback);
  }
}
