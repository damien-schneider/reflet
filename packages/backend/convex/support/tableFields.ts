import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  supportConversationStatus,
  supportMessageSenderType,
} from "../shared/validators";

export const supportTables = {
  messageReactions: defineTable({
    createdAt: v.number(),
    emoji: v.string(),
    messageId: v.id("supportMessages"),
    userId: v.string(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"])
    .index("by_message_user", ["messageId", "userId"]),
  supportConversations: defineTable({
    adminUnreadCount: v.number(),
    assignedTo: v.optional(v.string()),
    createdAt: v.number(),
    guestEmail: v.optional(v.string()),
    guestId: v.optional(v.string()),
    lastMessageAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
    organizationId: v.id("organizations"),
    status: supportConversationStatus,
    subject: v.optional(v.string()),
    updatedAt: v.number(),
    userId: v.string(),
    userUnreadCount: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_assigned", ["assignedTo"])
    .index("by_guest", ["guestId"]),

  supportMessages: defineTable({
    body: v.string(),
    conversationId: v.id("supportConversations"),
    createdAt: v.number(),
    isRead: v.boolean(),
    senderId: v.string(),
    senderType: supportMessageSenderType,
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"]),
};
