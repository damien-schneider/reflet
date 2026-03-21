"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send "You asked, we shipped" notifications to voters and subscribers
 * of feedback items linked to a newly published release.
 */
export const sendShippedNotifications = internalAction({
  args: {
    releaseId: v.id("releases"),
  },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: notification orchestration with multiple subscriber lookups
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.shipped_notifications_helpers.getShippedNotificationData,
      { releaseId: args.releaseId }
    );

    if (!data) {
      return { success: false, error: "Release or org not found" };
    }

    if (!data.isPro) {
      return { success: true, skipped: true, reason: "Not Pro tier" };
    }

    if (data.feedbackItems.length === 0) {
      return { success: true, emailsSent: 0 };
    }

    const siteUrl = process.env.SITE_URL ?? "";
    let totalSent = 0;

    for (const item of data.feedbackItems) {
      const recipients = await ctx.runQuery(
        internal.shipped_notifications_helpers.getFeedbackRecipients,
        { feedbackId: item.feedbackId as Id<"feedback"> }
      );

      const uniqueEmails = new Map<string, string>();
      for (const r of recipients) {
        if (r.email && !uniqueEmails.has(r.email)) {
          uniqueEmails.set(r.email, r.email);
        }
      }

      const emails = [...uniqueEmails.values()];

      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);

        for (const email of batch) {
          try {
            const isSuppressed = await ctx.runQuery(
              internal.email_suppression.isEmailSuppressed,
              { email }
            );

            if (isSuppressed) {
              continue;
            }

            await ctx.runAction(
              internal.email_renderer.sendFeedbackShippedEmail,
              {
                to: email,
                organizationName: data.orgName,
                feedbackTitle: item.feedbackTitle,
                releaseTitle: data.releaseTitle,
                feedbackUrl: `${siteUrl}/${data.orgSlug}/feedback/${item.feedbackId}`,
                releaseUrl: `${siteUrl}/${data.orgSlug}/changelog`,
                unsubscribeUrl: `${siteUrl}/settings/notifications`,
              }
            );
            totalSent++;
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : "Unknown error";
            console.error(
              `[Shipped Notifications] Failed to send to ${email}: ${errorMsg}`
            );
          }
        }

        if (i + BATCH_SIZE < emails.length) {
          await sleep(BATCH_DELAY_MS);
        }
      }
    }

    return { success: true, emailsSent: totalSent };
  },
});
