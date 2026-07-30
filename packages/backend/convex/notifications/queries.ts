import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";

// ============================================
// QUERIES
// ============================================

/**
 * List notifications for current user
 * Also includes pending invitations as notification-like items
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
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

      for (const invitation of pendingInvitations) {
        const org = await ctx.db.get(invitation.organizationId);
        if (org) {
          invitationNotifications.push({
            _creationTime: invitation.createdAt,
            _id: `invitation-${invitation._id}` as (typeof notifications)[0]["_id"],
            createdAt: invitation.createdAt,
            invitationToken: invitation.token,
            isRead: false,
            message: `Vous avez été invité à rejoindre ${org.name} en tant que ${invitation.role === "admin" ? "administrateur" : "membre"}.`,
            title: `Invitation à rejoindre ${org.name}`,
            type: "invitation" as const,
            userId: user._id,
          });
        }
      }
    }

    const allNotifications = [...notifications, ...invitationNotifications];

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

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

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
