import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
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

export const send = mutation({
  args: {
    conversationId: v.id("supportConversations"),
    body: v.string(),
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
      conversationId: args.conversationId,
      senderId,
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

    // Trigger autopilot support triage when a user sends a message
    if (senderType === "user") {
      const autopilotConfig = await ctx.db
        .query("autopilotConfig")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", conversation.organizationId)
        )
        .unique();

      if (
        autopilotConfig?.enabled &&
        autopilotConfig.supportEnabled !== false
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.agents.support.runSupportTriage,
          { organizationId: conversation.organizationId }
        );
      }
    }

    // Only send notifications for non-guest conversations
    if (senderType === "admin" && !conversation.guestId) {
      await ctx.db.insert("notifications", {
        userId: conversation.userId,
        type: "new_support_message",
        title: "New support message",
        message: `You have a new reply from support${conversation.subject ? `: ${conversation.subject}` : ""}`,
        isRead: false,
        createdAt: now,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.notifications.push.sendPushNotification,
        {
          userId: conversation.userId,
          type: "new_support_message",
          title: "New support message",
          message: `You have a new reply from support${conversation.subject ? `: ${conversation.subject}` : ""}`,
          url: "/dashboard",
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
