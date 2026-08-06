import { v } from "convex/values";
import { SUPPORT_PREVIEW_LENGTH } from "../shared/constants";
import {
  supportConversationStatus,
  supportMessageSenderType,
} from "../shared/validators";

export const supportPersonInfo = v.object({
  email: v.string(),
  image: v.optional(v.string()),
  name: v.optional(v.string()),
});

export const supportAssignedUser = v.object({
  email: v.string(),
  id: v.string(),
  image: v.optional(v.string()),
  name: v.optional(v.string()),
});

export const supportConversationDoc = v.object({
  _creationTime: v.number(),
  _id: v.id("supportConversations"),
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
});

export const supportConversationWithUser = v.object({
  ...supportConversationDoc.fields,
  user: v.optional(supportPersonInfo),
});

export const supportConversationDetail = v.object({
  ...supportConversationDoc.fields,
  assignedUser: v.optional(supportAssignedUser),
  isAdmin: v.boolean(),
  user: v.optional(supportPersonInfo),
});

export const supportMessageWithSender = v.object({
  _creationTime: v.number(),
  _id: v.id("supportMessages"),
  body: v.string(),
  conversationId: v.id("supportConversations"),
  createdAt: v.number(),
  isOwnMessage: v.boolean(),
  isRead: v.boolean(),
  sender: v.optional(
    v.object({
      email: v.string(),
      id: v.string(),
      image: v.optional(v.string()),
      name: v.optional(v.string()),
    })
  ),
  senderId: v.string(),
  senderType: supportMessageSenderType,
});

export const supportMessageReactions = v.object({
  messageId: v.id("supportMessages"),
  reactions: v.array(
    v.object({
      count: v.number(),
      emoji: v.string(),
      userIds: v.array(v.string()),
    })
  ),
});

const WHITESPACE_RUN = /\s+/g;

export const buildMessagePreview = (body: string): string => {
  const normalized = body.replace(WHITESPACE_RUN, " ").trim();
  return normalized.length > SUPPORT_PREVIEW_LENGTH
    ? `${normalized.slice(0, SUPPORT_PREVIEW_LENGTH - 1)}…`
    : normalized;
};
