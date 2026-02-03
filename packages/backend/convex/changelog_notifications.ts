"use node";

import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { internalAction } from "./_generated/server";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

interface Subscriber {
  _id: string;
  email?: string;
  userId?: string;
  unsubscribeToken: string;
}

async function resolveSubscriberEmail(
  ctx: ActionCtx,
  subscriber: Subscriber
): Promise<string | undefined> {
  if (subscriber.email) {
    return subscriber.email;
  }

  if (subscriber.userId) {
    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "id", operator: "eq", value: subscriber.userId }],
    })) as { email?: string } | null;

    return user?.email;
  }

  return undefined;
}

async function sendEmailToSubscriber(
  ctx: ActionCtx,
  subscriber: Subscriber,
  params: {
    siteUrl: string;
    releaseUrl: string;
    organizationName: string;
    releaseTitle: string;
    releaseVersion?: string;
    descriptionText: string;
  }
): Promise<boolean> {
  const email = await resolveSubscriberEmail(ctx, subscriber);

  if (!email) {
    console.warn(
      "[Changelog Notifications] Could not resolve email for subscriber:",
      subscriber._id
    );
    return false;
  }

  const unsubscribeUrl = `${params.siteUrl}/changelog/unsubscribe?token=${subscriber.unsubscribeToken}`;

  await ctx.runAction(internal.email_renderer.sendChangelogNotificationEmail, {
    to: email,
    organizationName: params.organizationName,
    releaseTitle: params.releaseTitle,
    releaseVersion: params.releaseVersion,
    releaseDescription: params.descriptionText,
    releaseUrl: params.releaseUrl,
    unsubscribeUrl,
  });

  return true;
}

async function processSubscriberBatch(
  ctx: ActionCtx,
  batch: Subscriber[],
  params: {
    siteUrl: string;
    releaseUrl: string;
    organizationName: string;
    releaseTitle: string;
    releaseVersion?: string;
    descriptionText: string;
  }
): Promise<{ sent: number; errors: string[] }> {
  let sent = 0;
  const errors: string[] = [];

  for (const subscriber of batch) {
    try {
      const success = await sendEmailToSubscriber(ctx, subscriber, params);
      if (success) {
        sent++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(
        "[Changelog Notifications] Failed to send email:",
        errorMsg
      );
      errors.push(errorMsg);
    }
  }

  return { sent, errors };
}

/**
 * Send release notification emails to all subscribers
 * Only sends emails if the organization is on Pro tier
 */
export const sendReleaseNotifications = internalAction({
  args: {
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.runQuery(
      internal.changelog_notifications_helpers.getRelease,
      { releaseId: args.releaseId }
    );

    if (!release) {
      console.error(
        "[Changelog Notifications] Release not found:",
        args.releaseId
      );
      return { success: false, error: "Release not found" };
    }

    const org = await ctx.runQuery(
      internal.changelog_notifications_helpers.getOrganization,
      { organizationId: release.organizationId }
    );

    if (!org) {
      console.error(
        "[Changelog Notifications] Organization not found:",
        release.organizationId
      );
      return { success: false, error: "Organization not found" };
    }

    if (org.subscriptionTier !== "pro") {
      console.log(
        "[Changelog Notifications] Skipping - organization is not on Pro tier"
      );
      return { success: true, skipped: true, reason: "Not Pro tier" };
    }

    const subscribers = (await ctx.runQuery(
      internal.changelog_subscriptions.getSubscribersByOrganization,
      { organizationId: release.organizationId }
    )) as Subscriber[];

    if (subscribers.length === 0) {
      console.log("[Changelog Notifications] No subscribers found");
      return { success: true, emailsSent: 0 };
    }

    const siteUrl = process.env.SITE_URL ?? "";
    const params = {
      siteUrl,
      releaseUrl: `${siteUrl}/${org.slug}/changelog`,
      organizationName: org.name,
      releaseTitle: release.title,
      releaseVersion: release.version,
      descriptionText: release.description
        ? stripHtmlTags(release.description).slice(0, 500)
        : "Check out the latest updates.",
    };

    let totalSent = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const { sent, errors } = await processSubscriberBatch(ctx, batch, params);
      totalSent += sent;
      allErrors.push(...errors);

      if (i + BATCH_SIZE < subscribers.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(
      `[Changelog Notifications] Sent ${totalSent}/${subscribers.length} emails`
    );

    return {
      success: true,
      emailsSent: totalSent,
      totalSubscribers: subscribers.length,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  },
});
