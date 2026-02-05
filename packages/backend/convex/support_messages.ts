import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { MAX_SUPPORT_MESSAGE_LENGTH } from "./constants";
import { validateInputLength } from "./validators";

const getAuthUser = async (ctx: { auth: unknown }) => {
  const user = await authComponent.safeGetAuthUser(
    ctx as Parameters<typeof authComponent.safeGetAuthUser>[0]
  );
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

export const list = query({
  args: {
    conversationId: v.id("supportConversations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return [];
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", conversation.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    const isAdmin =
      membership?.role === "admin" || membership?.role === "owner";
    const isOwner = conversation.userId === user._id;

    if (!(isAdmin || isOwner)) {
      return [];
    }

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    messages.sort((a, b) => a.createdAt - b.createdAt);

    const messagesWithSender = await Promise.all(
      messages.map(async (msg) => {
        const sender = await authComponent.getAnyUserById(ctx, msg.senderId);
        return {
          ...msg,
          sender: sender
            ? {
                id: sender._id,
                name: sender.name || undefined,
                email: sender.email,
                image: sender.image || undefined,
              }
            : undefined,
          isOwnMessage: msg.senderId === user._id,
        };
      })
    );

    return messagesWithSender;
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("supportConversations"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Validate input length
    validateInputLength(args.body, MAX_SUPPORT_MESSAGE_LENGTH, "Message");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", conversation.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    const isAdmin =
      membership?.role === "admin" || membership?.role === "owner";
    const isOwner = conversation.userId === user._id;

    if (!(isAdmin || isOwner)) {
      throw new Error("You don't have access to this conversation");
    }

    const now = Date.now();
    const senderType = isAdmin && !isOwner ? "admin" : "user";

    const messageId = await ctx.db.insert("supportMessages", {
      conversationId: args.conversationId,
      senderId: user._id,
      senderType: senderType as "user" | "admin",
      body: args.body,
      isRead: false,
      createdAt: now,
    });

    const updateData: {
      lastMessageAt: number;
      updatedAt: number;
      userUnreadCount?: number;
      adminUnreadCount?: number;
      status?: "open" | "awaiting_reply" | "resolved" | "closed";
    } = {
      lastMessageAt: now,
      updatedAt: now,
    };

    if (senderType === "admin") {
      updateData.userUnreadCount = conversation.userUnreadCount + 1;
      updateData.status = "awaiting_reply";
    } else {
      updateData.adminUnreadCount = conversation.adminUnreadCount + 1;
      if (conversation.status === "awaiting_reply") {
        updateData.status = "open";
      }
    }

    await ctx.db.patch(args.conversationId, updateData);

    if (senderType === "admin") {
      await ctx.db.insert("notifications", {
        userId: conversation.userId,
        type: "new_support_message",
        title: "New support message",
        message: `You have a new reply from support${conversation.subject ? `: ${conversation.subject}` : ""}`,
        isRead: false,
        createdAt: now,
      });
    }

    return messageId;
  },
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("supportConversations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", conversation.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    const isAdmin =
      membership?.role === "admin" || membership?.role === "owner";
    const isOwner = conversation.userId === user._id;

    if (!(isAdmin || isOwner)) {
      throw new Error("You don't have access to this conversation");
    }

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const message of messages) {
      if (!message.isRead) {
        const shouldMarkRead =
          (isOwner && message.senderType === "admin") ||
          (isAdmin && message.senderType === "user");

        if (shouldMarkRead) {
          await ctx.db.patch(message._id, { isRead: true });
        }
      }
    }

    if (isOwner) {
      await ctx.db.patch(args.conversationId, {
        userUnreadCount: 0,
        updatedAt: Date.now(),
      });
    } else if (isAdmin) {
      await ctx.db.patch(args.conversationId, {
        adminUnreadCount: 0,
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

export const addReaction = mutation({
  args: {
    messageId: v.id("supportMessages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", conversation.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    const isAdmin =
      membership?.role === "admin" || membership?.role === "owner";
    const isOwner = conversation.userId === user._id;

    if (!(isAdmin || isOwner)) {
      throw new Error("You don't have access to this message");
    }

    const existingReaction = await ctx.db
      .query("messageReactions")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", user._id)
      )
      .unique();

    if (existingReaction) {
      await ctx.db.patch(existingReaction._id, {
        emoji: args.emoji,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("messageReactions", {
        messageId: args.messageId,
        userId: user._id,
        emoji: args.emoji,
        createdAt: Date.now(),
      });
    }

    return true;
  },
});

export const removeReaction = mutation({
  args: {
    messageId: v.id("supportMessages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", conversation.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    const isAdmin =
      membership?.role === "admin" || membership?.role === "owner";
    const isOwner = conversation.userId === user._id;

    if (!(isAdmin || isOwner)) {
      throw new Error("You don't have access to this message");
    }

    const existingReaction = await ctx.db
      .query("messageReactions")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", user._id)
      )
      .unique();

    if (existingReaction) {
      await ctx.db.delete(existingReaction._id);
    }

    return true;
  },
});

export const listReactions = query({
  args: {
    messageIds: v.array(v.id("supportMessages")),
  },
  handler: async (ctx, args) => {
    const reactions = await Promise.all(
      args.messageIds.map(async (messageId) => {
        const messageReactions = await ctx.db
          .query("messageReactions")
          .withIndex("by_message", (q) => q.eq("messageId", messageId))
          .collect();

        const reactionsByEmoji = messageReactions.reduce(
          (acc, reaction) => {
            if (!acc[reaction.emoji]) {
              acc[reaction.emoji] = { count: 0, userIds: [] };
            }
            acc[reaction.emoji].count += 1;
            acc[reaction.emoji].userIds.push(reaction.userId);
            return acc;
          },
          {} as Record<string, { count: number; userIds: string[] }>
        );

        return {
          messageId,
          reactions: Object.entries(reactionsByEmoji).map(([emoji, data]) => ({
            emoji,
            count: data.count,
            userIds: data.userIds,
          })),
        };
      })
    );

    return reactions;
  },
});
