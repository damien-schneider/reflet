import { type Infer, v } from "convex/values";
import { SUPPORT_PREVIEW_LENGTH } from "../shared/constants";
import {
  supportConversationStatus,
  supportMessageSenderType,
} from "../shared/validators";
import { supportAttachmentView } from "./attachments";
import { supportMessageEmail } from "./email/message_email";

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
  customerNoticeSentAt: v.optional(v.number()),
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

export const supportEmailChannel = v.union(
  v.object({ from: v.string(), kind: v.literal("full") }),
  v.object({ kind: v.literal("notice") }),
  v.object({
    kind: v.literal("none"),
    reason: v.union(
      v.literal("no_email"),
      v.literal("suppressed"),
      v.literal("paused"),
      v.literal("unverified_contact")
    ),
  })
);

export type SupportEmailChannel = Infer<typeof supportEmailChannel>;

export const supportConversationDetail = v.object({
  ...supportConversationDoc.fields,
  assignedUser: v.optional(supportAssignedUser),
  emailChannel: v.optional(supportEmailChannel),
  isAdmin: v.boolean(),
  user: v.optional(supportPersonInfo),
  userId: v.optional(v.string()),
});

export type SupportConversationDetail = Infer<typeof supportConversationDetail>;

export const supportMessageSender = v.object({
  email: v.optional(v.string()),
  id: v.string(),
  image: v.optional(v.string()),
  name: v.optional(v.string()),
});

export type SupportMessageSender = Infer<typeof supportMessageSender>;

export const supportMessageWithSender = v.object({
  _creationTime: v.number(),
  _id: v.id("supportMessages"),
  attachments: v.array(supportAttachmentView),
  body: v.string(),
  conversationId: v.id("supportConversations"),
  createdAt: v.number(),
  email: v.optional(supportMessageEmail),
  isOwnMessage: v.boolean(),
  isRead: v.boolean(),
  sender: v.optional(supportMessageSender),
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
