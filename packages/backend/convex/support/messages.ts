import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";

const getAuthUser = async (ctx: QueryCtx) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

async function verifySendAccess(
  ctx: QueryCtx,
  conversation: Doc<"supportConversations">,
  guestId?: string
): Promise<{ isAdmin: boolean; isOwner: boolean; senderId: string }> {
  const user = await authComponent.safeGetAuthUser(ctx);

  if (user) {
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

    return { isAdmin, isOwner, senderId: user._id };
  }

  if (guestId && conversation.guestId === guestId) {
    return { isAdmin: false, isOwner: true, senderId: guestId };
  }

  throw new Error("You don't have access to this conversation");
}

export const list = query({
  args: {
    conversationId: v.id("supportConversations"),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return [];
    }

    // Access check: authenticated user or guest
    if (user) {
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
    } else if (!(args.guestId && conversation.guestId === args.guestId)) {
      return [];
    }

    const currentUserId = user?._id ?? args.guestId;

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
        let senderInfo:
          | { id: string; name?: string; email: string; image?: string }
          | undefined;
        if (sender) {
          senderInfo = {
            email: sender.email,
            id: sender._id,
            image: sender.image || undefined,
            name: sender.name || undefined,
          };
        } else if (conversation.guestEmail) {
          senderInfo = {
            email: conversation.guestEmail,
            id: msg.senderId,
            image: undefined,
            name: undefined,
          };
        }
        return {
          ...msg,
          isOwnMessage: msg.senderId === currentUserId,
          sender: senderInfo,
        };
      })
    );

    return messagesWithSender;
  },
});

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

    const { isAdmin, isOwner, senderId } = await verifySendAccess(
      ctx,
      conversation,
      args.guestId
    );

    const now = Date.now();
    const senderType = isAdmin && !isOwner ? "admin" : "user";

    const messageId = await ctx.db.insert("supportMessages", {
      body: args.body,
      conversationId: args.conversationId,
      createdAt: now,
      isRead: false,
      senderId,
      senderType: senderType as "user" | "admin",
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

    // Only send notifications for non-guest conversations
    if (senderType === "admin" && !conversation.guestId) {
      await ctx.db.insert("notifications", {
        createdAt: now,
        isRead: false,
        message: `You have a new reply from support${conversation.subject ? `: ${conversation.subject}` : ""}`,
        title: "New support message",
        type: "new_support_message",
        userId: conversation.userId,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.notifications.push.sendPushNotification,
        {
          message: `You have a new reply from support${conversation.subject ? `: ${conversation.subject}` : ""}`,
          title: "New support message",
          type: "new_support_message",
          url: "/dashboard",
          userId: conversation.userId,
        }
      );
    }

    return messageId;
  },
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("supportConversations"),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    let isAdmin = false;
    let isOwner = false;

    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q
            .eq("organizationId", conversation.organizationId)
            .eq("userId", user._id)
        )
        .unique();

      isAdmin = membership?.role === "admin" || membership?.role === "owner";
      isOwner = conversation.userId === user._id;

      if (!(isAdmin || isOwner)) {
        throw new Error("You don't have access to this conversation");
      }
    } else if (args.guestId && conversation.guestId === args.guestId) {
      isOwner = true;
    } else {
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
        updatedAt: Date.now(),
        userUnreadCount: 0,
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
    emoji: v.string(),
    messageId: v.id("supportMessages"),
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
        createdAt: Date.now(),
        emoji: args.emoji,
      });
    } else {
      await ctx.db.insert("messageReactions", {
        createdAt: Date.now(),
        emoji: args.emoji,
        messageId: args.messageId,
        userId: user._id,
      });
    }

    return true;
  },
});

export const removeReaction = mutation({
  args: {
    emoji: v.string(),
    messageId: v.id("supportMessages"),
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

        const reactionsByEmoji = messageReactions.reduce<
          Record<string, { count: number; userIds: string[] }>
        >((acc, reaction) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = { count: 0, userIds: [] };
          }
          const entry = acc[reaction.emoji];
          if (entry) {
            entry.count += 1;
            entry.userIds.push(reaction.userId);
          }
          return acc;
        }, {});

        return {
          messageId,
          reactions: Object.entries(reactionsByEmoji).map(([emoji, data]) => ({
            count: data.count,
            emoji,
            userIds: data.userIds,
          })),
        };
      })
    );

    return reactions;
  },
});
