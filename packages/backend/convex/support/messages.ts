import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireAuthUser } from "../shared/access";
import { rateLimiter } from "../shared/rate_limits";
import { validateInputLength } from "../shared/validators";
import {
  requireConversationAccess,
  resolveConversationAccess,
  supportCredential,
} from "./access";
import { attachmentViewsByMessage } from "./attachments";
import {
  appendCustomerMessage,
  requireMessageBody,
} from "./conversation_writes";
import { scheduleCustomerDelivery } from "./customer_delivery";
import { requestContactConfirmationOnce } from "./email/contacts";
import { describeMessageEmail } from "./email/message_email";
import { resolveMessageSenders } from "./people";
import {
  buildMessagePreview,
  type SupportMessageSender,
  supportMessageReactions,
  supportMessageWithSender,
} from "./validators";

const CUSTOMER_SENDER_ID = "customer";
const MAX_REACTION_EMOJI_LENGTH = 16;

export const list = query({
  args: {
    conversationId: v.id("supportConversations"),
    credential: v.optional(supportCredential),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return [];
    }

    const access = await resolveConversationAccess(
      ctx,
      conversation,
      args.credential
    );
    if (!access) {
      return [];
    }

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // a guest sender id is not a Better Auth id — looking it up throws
    const guestSenderId = conversation.guestId
      ? conversation.userId
      : undefined;
    const senders = await resolveMessageSenders(
      ctx,
      messages
        .map((message) => message.senderId)
        .filter((senderId) => senderId !== guestSenderId)
    );
    // the customer's sender id embeds their guest credential; only admins may see it
    const staffAliases = new Map(
      [...new Set(messages.map((message) => message.senderId))]
        .filter((senderId) => senderId !== conversation.userId)
        .map((senderId, index): [string, string] => [
          senderId,
          `staff-${index + 1}`,
        ])
    );
    const visibleSenderId = (senderId: string): string =>
      access.isAdmin
        ? senderId
        : (staffAliases.get(senderId) ?? CUSTOMER_SENDER_ID);
    const guestSender: SupportMessageSender | undefined =
      conversation.guestEmail
        ? {
            email: conversation.guestEmail,
            id: visibleSenderId(conversation.userId),
          }
        : undefined;
    const visibleSender = (
      senderId: string
    ): SupportMessageSender | undefined => {
      const sender = senders.get(senderId) ?? guestSender;
      const hidesStaffContact =
        !access.isAdmin && senderId !== conversation.userId;
      if (!(sender && hidesStaffContact)) {
        return sender;
      }
      return {
        id: visibleSenderId(senderId),
        image: sender.image,
        name: sender.name,
      };
    };

    const attachments = await attachmentViewsByMessage(ctx, conversation._id);

    return await Promise.all(
      messages.map(async (message) => ({
        _creationTime: message._creationTime,
        _id: message._id,
        attachments: attachments.get(message._id) ?? [],
        body: message.body,
        conversationId: message.conversationId,
        createdAt: message.createdAt,
        email: access.isAdmin
          ? await describeMessageEmail(ctx, message)
          : undefined,
        isOwnMessage: message.senderId === access.viewerId,
        isRead: message.isRead,
        sender: visibleSender(message.senderId),
        senderId: visibleSenderId(message.senderId),
        senderType: message.senderType,
      }))
    );
  },
  returns: v.array(supportMessageWithSender),
});

export const send = mutation({
  args: {
    body: v.string(),
    conversationId: v.id("supportConversations"),
    credential: v.optional(supportCredential),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const { isAdmin, isOwner, viewerId } = await requireConversationAccess(
      ctx,
      conversation,
      args.credential
    );

    const body = requireMessageBody(args.body);
    const now = Date.now();

    if (!isAdmin || isOwner) {
      await rateLimiter.limit(ctx, "supportCustomerMessagePerConversation", {
        key: conversation._id,
        throws: true,
      });
      const messageId = await appendCustomerMessage(ctx, conversation, {
        body,
        countsAsActivity: true,
        now,
      });
      if (conversation.guestId && conversation.guestEmail) {
        await requestContactConfirmationOnce(ctx, {
          email: conversation.guestEmail,
          organizationId: conversation.organizationId,
        });
      }
      return messageId;
    }

    const messageId = await ctx.db.insert("supportMessages", {
      body,
      conversationId: args.conversationId,
      createdAt: now,
      isRead: false,
      senderId: viewerId,
      senderType: "admin",
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: buildMessagePreview(body),
      status: "awaiting_reply",
      updatedAt: now,
      userUnreadCount: conversation.userUnreadCount + 1,
    });

    await scheduleCustomerDelivery(ctx, conversation, messageId);

    return messageId;
  },
  returns: v.id("supportMessages"),
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("supportConversations"),
    credential: v.optional(supportCredential),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const { isAdmin, isOwner } = await requireConversationAccess(
      ctx,
      conversation,
      args.credential
    );

    const readableSenderType = isOwner ? "admin" : "user";
    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    await Promise.all(
      messages
        .filter(
          (message) =>
            !message.isRead && message.senderType === readableSenderType
        )
        .map((message) => ctx.db.patch(message._id, { isRead: true }))
    );

    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
      ...(isOwner ? { userUnreadCount: 0 } : {}),
      ...(isAdmin && !isOwner ? { adminUnreadCount: 0 } : {}),
    });

    return null;
  },
  returns: v.null(),
});

const requireMessageAccess = async (
  ctx: MutationCtx,
  messageId: Doc<"supportMessages">["_id"]
) => {
  const message = await ctx.db.get(messageId);
  if (!message) {
    throw new Error("Message not found");
  }

  const conversation = await ctx.db.get(message.conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  await requireConversationAccess(ctx, conversation);
  return message;
};

export const addReaction = mutation({
  args: {
    emoji: v.string(),
    messageId: v.id("supportMessages"),
  },
  handler: async (ctx, args) => {
    if (!args.emoji) {
      throw new Error("Emoji is required");
    }
    validateInputLength(args.emoji, MAX_REACTION_EMOJI_LENGTH, "Emoji");
    const user = await requireAuthUser(ctx);
    await requireMessageAccess(ctx, args.messageId);

    const existingReaction = await ctx.db
      .query("messageReactions")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", user._id)
      )
      .unique();

    if (existingReaction) {
      await ctx.db.patch(existingReaction._id, {
        createdAt: Date.now(),
        emoji: args.emoji,
      });
      return null;
    }

    await ctx.db.insert("messageReactions", {
      createdAt: Date.now(),
      emoji: args.emoji,
      messageId: args.messageId,
      userId: user._id,
    });

    return null;
  },
  returns: v.null(),
});

export const removeReaction = mutation({
  args: {
    messageId: v.id("supportMessages"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    await requireMessageAccess(ctx, args.messageId);

    const existingReaction = await ctx.db
      .query("messageReactions")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", user._id)
      )
      .unique();

    if (existingReaction) {
      await ctx.db.delete(existingReaction._id);
    }

    return null;
  },
  returns: v.null(),
});

export const listReactions = query({
  args: {
    conversationId: v.id("supportConversations"),
    credential: v.optional(supportCredential),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return [];
    }

    const access = await resolveConversationAccess(
      ctx,
      conversation,
      args.credential
    );
    if (!access) {
      return [];
    }

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return await Promise.all(
      messages.map(async (message) => {
        const reactions = await ctx.db
          .query("messageReactions")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        const byEmoji = new Map<string, string[]>();
        for (const reaction of reactions) {
          const userIds = byEmoji.get(reaction.emoji) ?? [];
          userIds.push(reaction.userId);
          byEmoji.set(reaction.emoji, userIds);
        }

        return {
          messageId: message._id,
          reactions: [...byEmoji].map(([emoji, userIds]) => ({
            count: userIds.length,
            emoji,
            reactedByViewer: userIds.includes(access.viewerId),
          })),
        };
      })
    );
  },
  returns: v.array(supportMessageReactions),
});
