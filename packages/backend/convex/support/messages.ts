import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { MAX_SUPPORT_MESSAGE_LENGTH } from "../shared/constants";
import { getAuthUser } from "../shared/utils";
import { validateInputLength } from "../shared/validators";
import { requireConversationAccess, resolveConversationAccess } from "./access";
import { resolveMessageSenders } from "./people";
import {
  buildMessagePreview,
  supportMessageReactions,
  supportMessageWithSender,
} from "./validators";

const REOPENED_STATUSES: Doc<"supportConversations">["status"][] = [
  "awaiting_reply",
  "resolved",
  "closed",
];

export const list = query({
  args: {
    conversationId: v.id("supportConversations"),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return [];
    }

    const access = await resolveConversationAccess(
      ctx,
      conversation,
      args.guestId
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
    const guestSender = conversation.guestEmail
      ? { email: conversation.guestEmail, id: conversation.userId }
      : undefined;

    return messages.map((message) => ({
      ...message,
      isOwnMessage: message.senderId === access.viewerId,
      sender: senders.get(message.senderId) ?? guestSender,
    }));
  },
  returns: v.array(supportMessageWithSender),
});

const notifyUserOfAdminReply = async (
  ctx: MutationCtx,
  conversation: Doc<"supportConversations">,
  now: number
) => {
  const message = `You have a new reply from support${conversation.subject ? `: ${conversation.subject}` : ""}`;

  await ctx.db.insert("notifications", {
    createdAt: now,
    isRead: false,
    message,
    title: "New support message",
    type: "new_support_message",
    userId: conversation.userId,
  });

  await ctx.scheduler.runAfter(
    0,
    internal.notifications.push.sendPushNotification,
    {
      message,
      title: "New support message",
      type: "new_support_message",
      url: "/dashboard",
      userId: conversation.userId,
    }
  );
};

const nextStatus = (
  current: Doc<"supportConversations">["status"],
  isAdminReply: boolean
): Doc<"supportConversations">["status"] => {
  if (isAdminReply) {
    return "awaiting_reply";
  }
  return REOPENED_STATUSES.includes(current) ? "open" : current;
};

export const send = mutation({
  args: {
    body: v.string(),
    conversationId: v.id("supportConversations"),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const { isAdmin, isOwner, viewerId } = await requireConversationAccess(
      ctx,
      conversation,
      args.guestId
    );

    const body = args.body.trim();
    if (!body) {
      throw new Error("Message cannot be empty");
    }
    validateInputLength(body, MAX_SUPPORT_MESSAGE_LENGTH, "Message");

    const now = Date.now();
    const senderType = isAdmin && !isOwner ? "admin" : "user";

    const messageId = await ctx.db.insert("supportMessages", {
      body,
      conversationId: args.conversationId,
      createdAt: now,
      isRead: false,
      senderId: viewerId,
      senderType,
    });

    const isAdminReply = senderType === "admin";

    await ctx.db.patch(args.conversationId, {
      adminUnreadCount: isAdminReply
        ? conversation.adminUnreadCount
        : conversation.adminUnreadCount + 1,
      lastMessageAt: now,
      lastMessagePreview: buildMessagePreview(body),
      status: nextStatus(conversation.status, isAdminReply),
      updatedAt: now,
      userUnreadCount: isAdminReply
        ? conversation.userUnreadCount + 1
        : conversation.userUnreadCount,
    });

    if (isAdminReply && !conversation.guestId) {
      await notifyUserOfAdminReply(ctx, conversation, now);
    }

    return messageId;
  },
  returns: v.id("supportMessages"),
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("supportConversations"),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const { isAdmin, isOwner } = await requireConversationAccess(
      ctx,
      conversation,
      args.guestId
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
    const user = await getAuthUser(ctx);
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
    const user = await getAuthUser(ctx);
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
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return [];
    }

    const access = await resolveConversationAccess(
      ctx,
      conversation,
      args.guestId
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
            userIds,
          })),
        };
      })
    );
  },
  returns: v.array(supportMessageReactions),
});
