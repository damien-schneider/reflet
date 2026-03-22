import { defineTable } from "convex/server";
import { v } from "convex/values";
import { notificationType } from "../shared/validators";

export const notificationTables = {
  notifications: defineTable({
    userId: v.string(),
    type: notificationType,
    title: v.string(),
    message: v.string(),
    feedbackId: v.optional(v.id("feedback")),
    invitationToken: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"]),

  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  userNotificationPreferences: defineTable({
    userId: v.string(),
    pushEnabled: v.boolean(),
    notifyOnStatusChange: v.boolean(),
    notifyOnNewComment: v.boolean(),
    notifyOnVoteMilestone: v.boolean(),
    notifyOnNewSupportMessage: v.boolean(),
    notifyOnInvitation: v.boolean(),
    pushPromptDismissed: v.boolean(),
    weeklyDigestEnabled: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
};
