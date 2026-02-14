"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

// Notification type preference mapping
const NOTIFICATION_TYPE_PREFERENCE_MAP: Record<string, string> = {
  status_change: "notifyOnStatusChange",
  new_comment: "notifyOnNewComment",
  vote_milestone: "notifyOnVoteMilestone",
  new_support_message: "notifyOnNewSupportMessage",
  invitation: "notifyOnInvitation",
};

/**
 * Check if a notification type is enabled for the user.
 */
function isNotificationTypeEnabled(
  preferences: Record<string, unknown>,
  type: string
): boolean {
  const preferenceKey = NOTIFICATION_TYPE_PREFERENCE_MAP[type];
  if (!preferenceKey) {
    return true;
  }
  return preferences[preferenceKey] !== false;
}

/**
 * Get configured VAPID details or null if not configured.
 */
function getVapidConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@reflet.dev";

  if (!(publicKey && privateKey)) {
    console.error("[Push] VAPID keys not configured");
    return null;
  }

  return { publicKey, privateKey, subject };
}

interface PushSubscription {
  _id: Id<"pushSubscriptions">;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send payload to a single push subscription.
 * Returns whether the subscription has expired.
 */
async function sendToSubscription(
  subscription: PushSubscription,
  payload: string
): Promise<{ success: boolean; expired: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload
    );
    return { success: true, expired: false };
  } catch (error: unknown) {
    const statusCode =
      error instanceof Error && "statusCode" in error
        ? (error as { statusCode: number }).statusCode
        : 0;

    if (statusCode === 410 || statusCode === 404) {
      return { success: false, expired: true };
    }

    console.error(
      "[Push] Failed to send:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return { success: false, expired: false };
  }
}

/**
 * Send a push notification to a user.
 * Checks user preferences, fetches subscriptions, and sends via Web Push.
 * Cleans up expired subscriptions (HTTP 410).
 */
export const sendPushNotification = internalAction({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ sent: number; reason?: string; expired?: number }> => {
    const preferences = await ctx.runQuery(
      internal.push_notifications_queries.getPreferencesForUser,
      { userId: args.userId }
    );

    if (!preferences?.pushEnabled) {
      return { sent: 0, reason: "push_disabled" };
    }

    if (!isNotificationTypeEnabled(preferences, args.type)) {
      return { sent: 0, reason: "type_disabled" };
    }

    const subscriptions: PushSubscription[] = await ctx.runQuery(
      internal.push_notifications_queries.getSubscriptionsForUser,
      { userId: args.userId }
    );

    if (subscriptions.length === 0) {
      return { sent: 0, reason: "no_subscriptions" };
    }

    const vapid = getVapidConfig();
    if (!vapid) {
      return { sent: 0, reason: "vapid_not_configured" };
    }

    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    const payload = JSON.stringify({
      title: args.title,
      body: args.message,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      url: args.url ?? "/dashboard",
    });

    let sent = 0;
    const expiredIds: Id<"pushSubscriptions">[] = [];

    for (const subscription of subscriptions) {
      const result = await sendToSubscription(subscription, payload);
      if (result.success) {
        sent++;
      } else if (result.expired) {
        expiredIds.push(subscription._id);
      }
    }

    for (const subscriptionId of expiredIds) {
      await ctx.runMutation(
        internal.push_notifications_queries.removeSubscription,
        {
          subscriptionId,
        }
      );
    }

    return { sent, expired: expiredIds.length };
  },
});
