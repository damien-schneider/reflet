import type { FunctionArgs } from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { publicationState } from "../feedback/property_values";
import { truncateText } from "../sessions/formatters";
import { nonUserActorName } from "../shared/actors";
import { orgAdminIdsExcept } from "../shared/membership";
import { teamAlertEmailAddress } from "./team_alerts";

const EXCERPT_MAX_CHARS = 280;
export const NEW_FEEDBACK_ALERT_DEADLINE_MS = 15 * 60 * 1000;
const ANONYMOUS_AUTHOR_PREFIX = "anonymous:";
const UNKNOWN_ANONYMOUS_EMAIL = "unknown";

export const feedbackDashboardPath = (
  organizationSlug: string,
  feedbackId: Id<"feedback">
): string => `/dashboard/${organizationSlug}/feedback/${feedbackId}`;

const authorEmailOf = async (
  ctx: MutationCtx,
  feedback: Doc<"feedback">
): Promise<string | undefined> => {
  if (feedback.externalUserId) {
    return (await ctx.db.get(feedback.externalUserId))?.email;
  }
  const { authorId } = feedback;
  if (!authorId || nonUserActorName(authorId)) {
    return;
  }
  if (authorId.startsWith(ANONYMOUS_AUTHOR_PREFIX)) {
    const email = authorId.slice(ANONYMOUS_AUTHOR_PREFIX.length);
    return email === UNKNOWN_ANONYMOUS_EMAIL ? undefined : email;
  }
  return (await authComponent.getAnyUserById(ctx, authorId))?.email;
};

const emailAdmin = async (
  ctx: MutationCtx,
  email: Omit<
    FunctionArgs<typeof internal.notifications.new_feedback_email.send>,
    "to"
  >,
  userId: string
): Promise<void> => {
  const to = await teamAlertEmailAddress(ctx, {
    preference: "emailOnNewFeedback",
    rateLimit: "newFeedbackAlertPerMember",
    userId,
  });
  if (to) {
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.new_feedback_email.send,
      { ...email, to }
    );
  }
};

export const notifyTeamOfNewFeedback = async (
  ctx: MutationCtx,
  feedback: Doc<"feedback">
): Promise<void> => {
  const organization = await ctx.db.get(feedback.organizationId);
  if (!organization) {
    return;
  }
  const awaitingApproval = publicationState(feedback) === "pending";
  const title = awaitingApproval
    ? "New feedback awaiting approval"
    : "New feedback";
  const email = {
    authorEmail: await authorEmailOf(ctx, feedback),
    awaitingApproval,
    excerpt: truncateText(feedback.description.trim(), EXCERPT_MAX_CHARS),
    feedbackId: feedback._id,
    feedbackTitle: feedback.title,
    organizationId: organization._id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
  };
  const createdAt = Date.now();

  for (const userId of await orgAdminIdsExcept(
    ctx,
    organization._id,
    feedback.authorId
  )) {
    await ctx.db.insert("notifications", {
      createdAt,
      feedbackId: feedback._id,
      isRead: false,
      message: feedback.title,
      title,
      type: "new_feedback",
      userId,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.push.sendPushNotification,
      {
        message: feedback.title,
        title,
        type: "new_feedback",
        url: feedbackDashboardPath(organization.slug, feedback._id),
        userId,
      }
    );
    await emailAdmin(ctx, email, userId);
  }
};

export const settleNewFeedbackAlert = async (
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  verdict: { junk: boolean }
): Promise<void> => {
  if (!feedback.newFeedbackAlertPending) {
    return;
  }
  await ctx.db.patch(feedback._id, { newFeedbackAlertPending: undefined });
  if (!verdict.junk) {
    await notifyTeamOfNewFeedback(ctx, feedback);
  }
};

export const awaitTriageBeforeAlert = async (
  ctx: MutationCtx,
  feedbackId: Id<"feedback">
): Promise<void> => {
  await ctx.db.patch(feedbackId, { newFeedbackAlertPending: true });
  await ctx.scheduler.runAfter(
    NEW_FEEDBACK_ALERT_DEADLINE_MS,
    internal.notifications.new_feedback.settleAtDeadline,
    { feedbackId }
  );
};

export const settleAtDeadline = internalMutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (feedback && feedback.deletedAt === undefined) {
      await settleNewFeedbackAlert(ctx, feedback, { junk: false });
    }
    return null;
  },
  returns: v.null(),
});
