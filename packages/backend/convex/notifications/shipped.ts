import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import { NOTIFICATION_SETTINGS_PATH } from "./preferences";
import { optedInEmailAddress } from "./team_alerts";

const followerEmails = async (
  ctx: MutationCtx,
  feedbackId: Id<"feedback">
): Promise<Set<string>> => {
  const votes = await ctx.db
    .query("feedbackVotes")
    .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
    .collect();
  const subscriptions = await ctx.db
    .query("feedbackSubscriptions")
    .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
    .collect();
  const userIds = new Set(
    [...votes, ...subscriptions].flatMap(({ userId }) =>
      userId ? [userId] : []
    )
  );
  const emails = new Set<string>();
  for (const userId of userIds) {
    const email = await optedInEmailAddress(ctx, {
      preference: "emailOnFeedbackShipped",
      userId,
    });
    if (email) {
      emails.add(email);
    }
  }
  return emails;
};

export const sendShippedNotifications = internalMutation({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    const organization = release && (await ctx.db.get(release.organizationId));
    if (!(release && organization)) {
      return null;
    }
    if ((await getOrgTier(ctx, organization._id)) !== "pro") {
      return null;
    }
    const siteUrl = process.env.SITE_URL ?? "";
    const links = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", release._id))
      .collect();
    for (const link of links) {
      const feedback = await ctx.db.get(link.feedbackId);
      if (!feedback || feedback.deletedAt) {
        continue;
      }
      for (const to of await followerEmails(ctx, feedback._id)) {
        await ctx.scheduler.runAfter(
          0,
          internal.email.renderer.sendFeedbackShippedEmail,
          {
            feedbackTitle: feedback.title,
            feedbackUrl: `${siteUrl}/${organization.slug}/feedback/${feedback._id}`,
            organizationName: organization.name,
            releaseTitle: release.title,
            releaseUrl: `${siteUrl}/${organization.slug}/changelog`,
            to,
            unsubscribeUrl: `${siteUrl}${NOTIFICATION_SETTINGS_PATH}`,
          }
        );
      }
    }
    return null;
  },
  returns: v.null(),
});
