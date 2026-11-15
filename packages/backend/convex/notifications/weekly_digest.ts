import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { NOTIFICATION_SETTINGS_PATH } from "./preferences";
import { digestRecipientEmails, weeklyDigestOf } from "./weekly_digest_data";

export const sendAllDigests = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const organization of await ctx.db.query("organizations").collect()) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.weekly_digest.sendOrganizationDigest,
        { organizationId: organization._id }
      );
    }
    return null;
  },
  returns: v.null(),
});

export const sendOrganizationDigest = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      return null;
    }
    const digest = await weeklyDigestOf(ctx, organization._id);
    const hasActivity =
      digest.newFeedbackCount > 0 ||
      digest.totalVotes > 0 ||
      digest.statusChanges.length > 0;
    if (!hasActivity) {
      return null;
    }
    const siteUrl = process.env.SITE_URL ?? "";
    const email = {
      dashboardUrl: `${siteUrl}/dashboard/${organization.slug}`,
      newFeedbackCount: digest.newFeedbackCount,
      organizationName: organization.name,
      statusChanges: digest.statusChanges,
      topFeedback: digest.topFeedback.map((feedback) => ({
        status: feedback.status,
        title: feedback.title,
        url: `${siteUrl}/${organization.slug}/feedback/${feedback._id}`,
        voteCount: feedback.voteCount,
      })),
      totalVotes: digest.totalVotes,
      unsubscribeUrl: `${siteUrl}${NOTIFICATION_SETTINGS_PATH}`,
    };
    for (const to of await digestRecipientEmails(ctx, organization._id)) {
      await ctx.scheduler.runAfter(
        0,
        internal.email.renderer.sendWeeklyDigestEmail,
        { ...email, to }
      );
    }
    return null;
  },
  returns: v.null(),
});
