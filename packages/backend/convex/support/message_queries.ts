import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";

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
            id: sender._id,
            name: sender.name || undefined,
            email: sender.email,
            image: sender.image || undefined,
          };
        } else if (conversation.guestEmail) {
          senderInfo = {
            id: msg.senderId,
            name: undefined,
            email: conversation.guestEmail,
            image: undefined,
          };
        }
        return {
          ...msg,
          sender: senderInfo,
          isOwnMessage: msg.senderId === currentUserId,
        };
      })
    );

    return messagesWithSender;
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
