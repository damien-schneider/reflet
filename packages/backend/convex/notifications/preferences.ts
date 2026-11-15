import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";

export const NOTIFICATION_SETTINGS_PATH =
  "/dashboard/account?tab=notifications";

export const DEFAULT_PREFERENCES = {
  emailOnFeedbackShipped: true,
  emailOnInboxMessage: true,
  emailOnNewFeedback: true,
  emailOnWeeklyDigest: true,
  notifyOnInboxMessage: true,
  notifyOnIncident: true,
  notifyOnInvitation: true,
  notifyOnNewComment: true,
  notifyOnNewFeedback: true,
  notifyOnNewSupportMessage: true,
  notifyOnStatusChange: true,
  notifyOnVoteMilestone: true,
  pushEnabled: false,
  pushPromptDismissed: false,
} as const;

/**
 * Get notification preferences for the current user.
 * Returns sensible defaults if no record exists.
 */
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return DEFAULT_PREFERENCES;
    }

    const preferences = await ctx.db
      .query("userNotificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!preferences) {
      return DEFAULT_PREFERENCES;
    }

    return {
      emailOnFeedbackShipped:
        preferences.emailOnFeedbackShipped ??
        DEFAULT_PREFERENCES.emailOnFeedbackShipped,
      emailOnInboxMessage:
        preferences.emailOnInboxMessage ??
        DEFAULT_PREFERENCES.emailOnInboxMessage,
      emailOnNewFeedback:
        preferences.emailOnNewFeedback ??
        DEFAULT_PREFERENCES.emailOnNewFeedback,
      emailOnWeeklyDigest:
        preferences.emailOnWeeklyDigest ??
        DEFAULT_PREFERENCES.emailOnWeeklyDigest,
      notifyOnInboxMessage:
        preferences.notifyOnInboxMessage ??
        DEFAULT_PREFERENCES.notifyOnInboxMessage,
      notifyOnIncident:
        preferences.notifyOnIncident ?? DEFAULT_PREFERENCES.notifyOnIncident,
      notifyOnInvitation: preferences.notifyOnInvitation,
      notifyOnNewComment: preferences.notifyOnNewComment,
      notifyOnNewFeedback:
        preferences.notifyOnNewFeedback ??
        DEFAULT_PREFERENCES.notifyOnNewFeedback,
      notifyOnNewSupportMessage: preferences.notifyOnNewSupportMessage,
      notifyOnStatusChange: preferences.notifyOnStatusChange,
      notifyOnVoteMilestone: preferences.notifyOnVoteMilestone,
      pushEnabled: preferences.pushEnabled,
      pushPromptDismissed: preferences.pushPromptDismissed,
    };
  },
});

/**
 * Update notification preferences for the current user.
 * Creates a new record if one doesn't exist (upsert).
 */
export const updatePreferences = mutation({
  args: {
    emailOnFeedbackShipped: v.optional(v.boolean()),
    emailOnInboxMessage: v.optional(v.boolean()),
    emailOnNewFeedback: v.optional(v.boolean()),
    emailOnWeeklyDigest: v.optional(v.boolean()),
    notifyOnInboxMessage: v.optional(v.boolean()),
    notifyOnIncident: v.optional(v.boolean()),
    notifyOnInvitation: v.optional(v.boolean()),
    notifyOnNewComment: v.optional(v.boolean()),
    notifyOnNewFeedback: v.optional(v.boolean()),
    notifyOnNewSupportMessage: v.optional(v.boolean()),
    notifyOnStatusChange: v.optional(v.boolean()),
    notifyOnVoteMilestone: v.optional(v.boolean()),
    pushEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userNotificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("userNotificationPreferences", {
      createdAt: now,
      emailOnFeedbackShipped: args.emailOnFeedbackShipped,
      emailOnInboxMessage: args.emailOnInboxMessage,
      emailOnNewFeedback: args.emailOnNewFeedback,
      emailOnWeeklyDigest: args.emailOnWeeklyDigest,
      notifyOnInboxMessage: args.notifyOnInboxMessage,
      notifyOnIncident:
        args.notifyOnIncident ?? DEFAULT_PREFERENCES.notifyOnIncident,
      notifyOnInvitation:
        args.notifyOnInvitation ?? DEFAULT_PREFERENCES.notifyOnInvitation,
      notifyOnNewComment:
        args.notifyOnNewComment ?? DEFAULT_PREFERENCES.notifyOnNewComment,
      notifyOnNewFeedback: args.notifyOnNewFeedback,
      notifyOnNewSupportMessage:
        args.notifyOnNewSupportMessage ??
        DEFAULT_PREFERENCES.notifyOnNewSupportMessage,
      notifyOnStatusChange:
        args.notifyOnStatusChange ?? DEFAULT_PREFERENCES.notifyOnStatusChange,
      notifyOnVoteMilestone:
        args.notifyOnVoteMilestone ?? DEFAULT_PREFERENCES.notifyOnVoteMilestone,
      pushEnabled: args.pushEnabled ?? DEFAULT_PREFERENCES.pushEnabled,
      pushPromptDismissed: false,
      updatedAt: now,
      userId: user._id,
    });
  },
});

/**
 * Dismiss the push notification prompt so it doesn't show again.
 */
export const dismissPushPrompt = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userNotificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pushPromptDismissed: true,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userNotificationPreferences", {
      userId: user._id,
      ...DEFAULT_PREFERENCES,
      createdAt: now,
      pushPromptDismissed: true,
      updatedAt: now,
    });
  },
});
