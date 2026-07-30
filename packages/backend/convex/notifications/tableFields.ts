import { defineTable } from "convex/server";
import { v } from "convex/values";
import { notificationType } from "../shared/validators";

export const notificationTables = {
  notifications: defineTable({
    createdAt: v.number(),
    feedbackId: v.optional(v.id("feedback")),
    invitationToken: v.optional(v.string()),
    isRead: v.boolean(),
    message: v.string(),
    title: v.string(),
    type: notificationType,
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"]),

  pushSubscriptions: defineTable({
    auth: v.string(),
    createdAt: v.number(),
    endpoint: v.string(),
    p256dh: v.string(),
    userAgent: v.optional(v.string()),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  userNotificationPreferences: defineTable({
    createdAt: v.number(),
    notifyOnInvitation: v.boolean(),
    notifyOnNewComment: v.boolean(),
    notifyOnNewSupportMessage: v.boolean(),
    notifyOnStatusChange: v.boolean(),
    notifyOnVoteMilestone: v.boolean(),
    pushEnabled: v.boolean(),
    pushPromptDismissed: v.boolean(),
    updatedAt: v.number(),
    userId: v.string(),
    weeklyDigestEnabled: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),
};
