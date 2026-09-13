import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { FeedbackStatusValue } from "../shared/validators";
import { emitWebhookEvent } from "../webhooks/mutations";
import { isFinishedStatus, mapStatusNameToEnum } from "./status_utils";

export type StatusChangeSource =
  | "user"
  | "api"
  | "ai"
  | "github"
  | "release"
  | "stale"
  | "agent";

export interface StatusChange {
  actorId: string;
  details?: Record<string, unknown>;
  organizationStatusId?: Id<"organizationStatuses"> | null;
  source: StatusChangeSource;
  status?: FeedbackStatusValue;
}

async function resolveTarget(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  change: StatusChange
): Promise<{
  organizationStatusId: Id<"organizationStatuses"> | undefined;
  status: FeedbackStatusValue;
}> {
  if (change.organizationStatusId === undefined) {
    return {
      organizationStatusId: feedback.organizationStatusId,
      status: change.status ?? feedback.status,
    };
  }
  if (change.organizationStatusId === null) {
    return {
      organizationStatusId: undefined,
      status: change.status ?? feedback.status,
    };
  }
  const organizationStatus = await ctx.db.get(change.organizationStatusId);
  if (
    !organizationStatus ||
    organizationStatus.organizationId !== feedback.organizationId
  ) {
    throw new Error("Invalid status for this organization");
  }
  return {
    organizationStatusId: organizationStatus._id,
    status: change.status ?? mapStatusNameToEnum(organizationStatus.name),
  };
}

async function scheduleGithubSideEffects(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  status: FeedbackStatusValue
): Promise<void> {
  if (isFinishedStatus(status)) {
    const linkedIssue = await ctx.db
      .query("githubIssues")
      .withIndex("by_reflet_feedback", (q) =>
        q.eq("refletFeedbackId", feedback._id)
      )
      .first();
    if (linkedIssue?.state === "open") {
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.github.issue_promote.closeIssue,
        {
          issueId: linkedIssue._id,
          stateReason: status === "completed" ? "completed" : "not_planned",
        }
      );
    }
    return;
  }

  if (feedback.githubIssueId || !feedback.isApproved) {
    return;
  }
  const connection = await ctx.db
    .query("githubConnections")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", feedback.organizationId)
    )
    .first();
  const promotesOnThisStatus =
    connection?.promoteTrigger === "on_status" &&
    connection.promoteStatus === status;
  if (promotesOnThisStatus) {
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.issue_promote.promoteFeedback,
      { feedbackId: feedback._id, organizationId: feedback.organizationId }
    );
  }
}

function completedAtFor(
  feedback: Doc<"feedback">,
  status: FeedbackStatusValue,
  now: number
): number | undefined {
  if (status !== "completed") {
    return;
  }
  return feedback.status === "completed" ? feedback.completedAt : now;
}

export async function changeFeedbackStatus(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  change: StatusChange
): Promise<boolean> {
  const target = await resolveTarget(ctx, feedback, change);
  const statusChanged = target.status !== feedback.status;
  const organizationStatusChanged =
    target.organizationStatusId !== feedback.organizationStatusId;
  if (!(statusChanged || organizationStatusChanged)) {
    return false;
  }

  const now = Date.now();
  await ctx.db.patch(feedback._id, {
    ...(isFinishedStatus(target.status)
      ? { claimedAt: undefined, claimedBy: undefined }
      : {}),
    completedAt: completedAtFor(feedback, target.status, now),
    organizationStatusId: target.organizationStatusId,
    status: target.status,
    updatedAt: now,
  });

  await ctx.db.insert("activityLogs", {
    action: "status_changed",
    authorId: change.actorId,
    createdAt: now,
    details: JSON.stringify({
      newStatus: target.status,
      oldStatus: feedback.status,
      source: change.source,
      ...change.details,
    }),
    feedbackId: feedback._id,
    organizationId: feedback.organizationId,
  });

  if (statusChanged) {
    await scheduleGithubSideEffects(ctx, feedback, target.status);
  }
  await emitWebhookEvent(ctx, {
    event: "feedback.status_changed",
    feedbackId: feedback._id,
    organizationId: feedback.organizationId,
  });
  return true;
}
