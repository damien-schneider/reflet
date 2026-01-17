import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

// ============================================
// QUERIES
// ============================================

/**
 * List notifications for current user
 */
export const list = query({
  args: {
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (args.unreadOnly) {
      notifications = notifications.filter((n) => !n.isRead);
    }

    // Sort by newest first
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      notifications = notifications.slice(0, args.limit);
    }

    return notifications;
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 0;
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    return notifications.length;
  },
});
