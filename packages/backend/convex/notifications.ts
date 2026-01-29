import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

// ============================================
// QUERIES
// ============================================

/**
 * List notifications for current user
 * Also includes pending invitations as notification-like items
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

    // Get regular notifications
    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (args.unreadOnly) {
      notifications = notifications.filter((n) => !n.isRead);
    }

    // Get pending invitations for this user's email
    const userEmail = user.email?.toLowerCase();
    const invitationNotifications: typeof notifications = [];

    if (userEmail) {
      const pendingInvitations = await ctx.db
        .query("invitations")
        .filter((q) =>
          q.and(
            q.eq(q.field("email"), userEmail),
            q.eq(q.field("status"), "pending"),
            q.gt(q.field("expiresAt"), Date.now())
          )
        )
        .collect();

      // Get organization names for invitations
      for (const invitation of pendingInvitations) {
        const org = await ctx.db.get(invitation.organizationId);
        if (org) {
          invitationNotifications.push({
            _id: `invitation-${invitation._id}` as (typeof notifications)[0]["_id"],
            _creationTime: invitation.createdAt,
            userId: user._id,
            type: "invitation" as const,
            title: `Invitation à rejoindre ${org.name}`,
            message: `Vous avez été invité à rejoindre ${org.name} en tant que ${invitation.role === "admin" ? "administrateur" : "membre"}.`,
            invitationToken: invitation.token,
            isRead: false,
            createdAt: invitation.createdAt,
          });
        }
      }
    }

    // Merge notifications and invitations
    const allNotifications = [...notifications, ...invitationNotifications];

    // Sort by newest first
    allNotifications.sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      return allNotifications.slice(0, args.limit);
    }

    return allNotifications;
  },
});

/**
 * Get unread notification count
 * Also includes pending invitations
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 0;
    }

    // Count unread regular notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    // Count pending invitations
    const userEmail = user.email?.toLowerCase();
    let pendingInvitationsCount = 0;

    if (userEmail) {
      const pendingInvitations = await ctx.db
        .query("invitations")
        .filter((q) =>
          q.and(
            q.eq(q.field("email"), userEmail),
            q.eq(q.field("status"), "pending"),
            q.gt(q.field("expiresAt"), Date.now())
          )
        )
        .collect();
      pendingInvitationsCount = pendingInvitations.length;
    }

    return notifications.length + pendingInvitationsCount;
  },
});
