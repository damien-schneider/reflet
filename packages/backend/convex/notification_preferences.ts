import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const DEFAULT_PREFERENCES = {
  pushEnabled: false,
  notifyOnStatusChange: true,
  notifyOnNewComment: true,
  notifyOnVoteMilestone: true,
  notifyOnNewSupportMessage: true,
  notifyOnInvitation: true,
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
      pushEnabled: preferences.pushEnabled,
      notifyOnStatusChange: preferences.notifyOnStatusChange,
      notifyOnNewComment: preferences.notifyOnNewComment,
      notifyOnVoteMilestone: preferences.notifyOnVoteMilestone,
      notifyOnNewSupportMessage: preferences.notifyOnNewSupportMessage,
      notifyOnInvitation: preferences.notifyOnInvitation,
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
    pushEnabled: v.optional(v.boolean()),
    notifyOnStatusChange: v.optional(v.boolean()),
    notifyOnNewComment: v.optional(v.boolean()),
    notifyOnVoteMilestone: v.optional(v.boolean()),
    notifyOnNewSupportMessage: v.optional(v.boolean()),
    notifyOnInvitation: v.optional(v.boolean()),
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
      const updateData: Record<string, unknown> = { updatedAt: now };
      if (args.pushEnabled !== undefined) {
        updateData.pushEnabled = args.pushEnabled;
      }
      if (args.notifyOnStatusChange !== undefined) {
        updateData.notifyOnStatusChange = args.notifyOnStatusChange;
      }
      if (args.notifyOnNewComment !== undefined) {
        updateData.notifyOnNewComment = args.notifyOnNewComment;
      }
      if (args.notifyOnVoteMilestone !== undefined) {
        updateData.notifyOnVoteMilestone = args.notifyOnVoteMilestone;
      }
      if (args.notifyOnNewSupportMessage !== undefined) {
        updateData.notifyOnNewSupportMessage = args.notifyOnNewSupportMessage;
      }
      if (args.notifyOnInvitation !== undefined) {
        updateData.notifyOnInvitation = args.notifyOnInvitation;
      }
      await ctx.db.patch(existing._id, updateData);
      return existing._id;
    }

    return await ctx.db.insert("userNotificationPreferences", {
      userId: user._id,
      pushEnabled: args.pushEnabled ?? DEFAULT_PREFERENCES.pushEnabled,
      notifyOnStatusChange:
        args.notifyOnStatusChange ?? DEFAULT_PREFERENCES.notifyOnStatusChange,
      notifyOnNewComment:
        args.notifyOnNewComment ?? DEFAULT_PREFERENCES.notifyOnNewComment,
      notifyOnVoteMilestone:
        args.notifyOnVoteMilestone ?? DEFAULT_PREFERENCES.notifyOnVoteMilestone,
      notifyOnNewSupportMessage:
        args.notifyOnNewSupportMessage ??
        DEFAULT_PREFERENCES.notifyOnNewSupportMessage,
      notifyOnInvitation:
        args.notifyOnInvitation ?? DEFAULT_PREFERENCES.notifyOnInvitation,
      pushPromptDismissed: false,
      createdAt: now,
      updatedAt: now,
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
      pushPromptDismissed: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
