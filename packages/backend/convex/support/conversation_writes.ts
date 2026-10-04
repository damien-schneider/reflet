import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { MAX_SUPPORT_MESSAGE_LENGTH } from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import { buildMessagePreview } from "./validators";

export const requireMessageBody = (raw: string): string => {
  const body = raw.trim();
  if (!body) {
    throw new Error("Message cannot be empty");
  }
  validateInputLength(body, MAX_SUPPORT_MESSAGE_LENGTH, "Message");
  return body;
};

type ConversationStatus = Doc<"supportConversations">["status"];

const REOPENED_STATUSES: ConversationStatus[] = [
  "awaiting_reply",
  "resolved",
  "closed",
];

export const statusAfterCustomerMessage = (
  current: ConversationStatus
): ConversationStatus =>
  REOPENED_STATUSES.includes(current) ? "open" : current;

export type ConversationCustomer =
  | { kind: "user"; userId: string }
  | { kind: "guest"; guestEmail?: string; guestId: string };

export const newGuestCustomer = (
  guestEmail?: string
): ConversationCustomer => ({
  guestEmail,
  guestId: crypto.randomUUID(),
  kind: "guest",
});

export const customerSenderId = (customer: ConversationCustomer): string =>
  customer.kind === "user" ? customer.userId : `guest:${customer.guestId}`;

export const createCustomerConversation = async (
  ctx: MutationCtx,
  args: {
    body: string;
    customer: ConversationCustomer;
    now: number;
    organizationId: Id<"organizations">;
    subject?: string;
  }
): Promise<{
  conversationId: Id<"supportConversations">;
  messageId: Id<"supportMessages">;
}> => {
  const { body, customer, now } = args;
  const senderId = customerSenderId(customer);
  const guest = customer.kind === "guest" ? customer : undefined;

  const conversationId = await ctx.db.insert("supportConversations", {
    adminUnreadCount: 1,
    assignedTo: undefined,
    createdAt: now,
    guestEmail: guest?.guestEmail,
    guestId: guest?.guestId,
    lastMessageAt: now,
    lastMessagePreview: buildMessagePreview(body),
    organizationId: args.organizationId,
    status: "open",
    subject: args.subject?.trim() || undefined,
    updatedAt: now,
    userId: senderId,
    userUnreadCount: 0,
  });

  const messageId = await ctx.db.insert("supportMessages", {
    body,
    conversationId,
    createdAt: now,
    isRead: false,
    senderId,
    senderType: "user",
  });

  return { conversationId, messageId };
};

export const appendCustomerMessage = async (
  ctx: MutationCtx,
  conversation: Doc<"supportConversations">,
  args: { body: string; now: number }
): Promise<Id<"supportMessages">> => {
  const { body, now } = args;

  const messageId = await ctx.db.insert("supportMessages", {
    body,
    conversationId: conversation._id,
    createdAt: now,
    isRead: false,
    senderId: conversation.userId,
    senderType: "user",
  });

  await ctx.db.patch(conversation._id, {
    adminUnreadCount: conversation.adminUnreadCount + 1,
    lastMessageAt: now,
    lastMessagePreview: buildMessagePreview(body),
    status: statusAfterCustomerMessage(conversation.status),
    updatedAt: now,
  });

  return messageId;
};
