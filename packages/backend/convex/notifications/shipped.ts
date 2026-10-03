"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { type ActionCtx, internalAction } from "../_generated/server";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ShippedEmailContext {
  feedbackId: string;
  feedbackTitle: string;
  orgName: string;
  orgSlug: string;
  releaseTitle: string;
  siteUrl: string;
}

async function sendShippedEmail(
  ctx: ActionCtx,
  email: string,
  shipped: ShippedEmailContext
): Promise<boolean> {
  try {
    const isSuppressed = await ctx.runQuery(
      internal.email.suppression.isEmailSuppressed,
      { email }
    );
    if (isSuppressed) {
      return false;
    }
    await ctx.runAction(internal.email.renderer.sendFeedbackShippedEmail, {
      feedbackTitle: shipped.feedbackTitle,
      feedbackUrl: `${shipped.siteUrl}/${shipped.orgSlug}/feedback/${shipped.feedbackId}`,
      organizationName: shipped.orgName,
      releaseTitle: shipped.releaseTitle,
      releaseUrl: `${shipped.siteUrl}/${shipped.orgSlug}/changelog`,
      to: email,
      unsubscribeUrl: `${shipped.siteUrl}/settings/notifications`,
    });
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[Shipped Notifications] Failed to send to ${email}: ${errorMsg}`
    );
    return false;
  }
}

async function sendShippedEmailsInBatches(
  ctx: ActionCtx,
  emails: string[],
  shipped: ShippedEmailContext
): Promise<number> {
  let sent = 0;
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    for (const email of emails.slice(i, i + BATCH_SIZE)) {
      if (await sendShippedEmail(ctx, email, shipped)) {
        sent++;
      }
    }
    if (i + BATCH_SIZE < emails.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
  return sent;
}

/**
 * Send "You asked, we shipped" notifications to voters and subscribers
 * of feedback items linked to a newly published release.
 */
export const sendShippedNotifications = internalAction({
  args: {
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.notifications.shipped_helpers.getShippedNotificationData,
      { releaseId: args.releaseId }
    );

    if (!data) {
      return { error: "Release or org not found", success: false };
    }

    if (!data.isPro) {
      return { reason: "Not Pro tier", skipped: true, success: true };
    }

    const siteUrl = process.env.SITE_URL ?? "";
    let totalSent = 0;

    for (const item of data.feedbackItems) {
      const recipients = await ctx.runQuery(
        internal.notifications.shipped_helpers.getFeedbackRecipients,
        { feedbackId: item.feedbackId }
      );
      const uniqueEmails = [
        ...new Set(recipients.flatMap((r) => (r.email ? [r.email] : []))),
      ];
      totalSent += await sendShippedEmailsInBatches(ctx, uniqueEmails, {
        feedbackId: item.feedbackId,
        feedbackTitle: item.feedbackTitle,
        orgName: data.orgName,
        orgSlug: data.orgSlug,
        releaseTitle: data.releaseTitle,
        siteUrl,
      });
    }

    return { emailsSent: totalSent, success: true };
  },
});
