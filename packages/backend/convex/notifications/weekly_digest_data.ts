import { z } from "zod";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { optedInEmailAddress } from "./team_alerts";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DIGEST_LIST_SIZE = 5;

const statusChangeDetails = z.object({
  newStatus: z.string(),
  oldStatus: z.string(),
});

export interface WeeklyDigest {
  newFeedbackCount: number;
  statusChanges: { from: string; title: string; to: string }[];
  topFeedback: Pick<
    Doc<"feedback">,
    "_id" | "status" | "title" | "voteCount"
  >[];
  totalVotes: number;
}

const countVotesSince = async (
  ctx: MutationCtx,
  feedback: Doc<"feedback">[],
  since: number
): Promise<number> => {
  const votes = await Promise.all(
    feedback.map((item) =>
      ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedback_created_at", (q) =>
          q.eq("feedbackId", item._id).gte("createdAt", since)
        )
        .collect()
    )
  );
  return votes.reduce((total, itemVotes) => total + itemVotes.length, 0);
};

const statusChangesSince = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  since: number
): Promise<WeeklyDigest["statusChanges"]> => {
  const logs = await ctx.db
    .query("activityLogs")
    .withIndex("by_organization_action_created_at", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("action", "status_changed")
        .gte("createdAt", since)
    )
    .take(DIGEST_LIST_SIZE);
  const changes: WeeklyDigest["statusChanges"] = [];
  for (const log of logs) {
    const feedback = log.feedbackId && (await ctx.db.get(log.feedbackId));
    if (feedback && log.details) {
      const details = statusChangeDetails.parse(JSON.parse(log.details));
      changes.push({
        from: details.oldStatus,
        title: feedback.title,
        to: details.newStatus,
      });
    }
  }
  return changes;
};

export const weeklyDigestOf = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">
): Promise<WeeklyDigest> => {
  const since = Date.now() - ONE_WEEK_MS;
  const feedback = await ctx.db
    .query("feedback")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();
  const live = feedback.filter((item) => !item.deletedAt);
  return {
    newFeedbackCount: live.filter((item) => item.createdAt >= since).length,
    statusChanges: await statusChangesSince(ctx, organizationId, since),
    topFeedback: live
      .filter((item) => item.isApproved)
      .sort((a, b) => b.voteCount - a.voteCount)
      .slice(0, DIGEST_LIST_SIZE),
    totalVotes: await countVotesSince(ctx, feedback, since),
  };
};

export const digestRecipientEmails = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">
): Promise<string[]> => {
  const members = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();
  const emails: string[] = [];
  for (const member of members) {
    const email = await optedInEmailAddress(ctx, {
      preference: "emailOnWeeklyDigest",
      userId: member.userId,
    });
    if (email) {
      emails.push(email);
    }
  }
  return emails;
};
