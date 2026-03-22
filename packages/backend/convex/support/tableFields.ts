import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  supportConversationStatus,
  supportMessageSenderType,
} from "../shared/validators";

export const supportTables = {
  supportConversations: defineTable({
    organizationId: v.id("organizations"),
    userId: v.string(),
    subject: v.optional(v.string()),
    status: supportConversationStatus,
    assignedTo: v.optional(v.string()),
    lastMessageAt: v.number(),
    userUnreadCount: v.number(),
    adminUnreadCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_assigned", ["assignedTo"]),

  supportMessages: defineTable({
    conversationId: v.id("supportConversations"),
    senderId: v.string(),
    senderType: supportMessageSenderType,
    body: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"]),

  messageReactions: defineTable({
    messageId: v.id("supportMessages"),
    userId: v.string(),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"])
    .index("by_message_user", ["messageId", "userId"]),
};
