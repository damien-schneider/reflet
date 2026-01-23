import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateVisitorId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "v_";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const getConfig = query({
  args: {
    widgetId: v.string(),
  },
  handler: async (ctx, args) => {
    const widget = await ctx.db
      .query("widgets")
      .withIndex("by_widget_id", (q) => q.eq("widgetId", args.widgetId))
      .unique();

    if (!widget?.isActive) {
      return null;
    }

    const settings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_widget", (q) => q.eq("widgetId", widget._id))
      .unique();

    if (!settings) {
      return null;
    }

    const org = await ctx.db.get(widget.organizationId);
    if (!org) {
      return null;
    }

    return {
      widgetId: args.widgetId,
      organizationName: org.name,
      primaryColor: settings.primaryColor,
      position: settings.position,
      welcomeMessage: settings.welcomeMessage,
      greetingMessage: settings.greetingMessage,
      showLauncher: settings.showLauncher,
      autoOpen: settings.autoOpen,
      zIndex: settings.zIndex,
    };
  },
});

export const getOrCreateConversation = mutation({
  args: {
    widgetId: v.string(),
    visitorId: v.string(),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        url: v.optional(v.string()),
        referrer: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const widget = await ctx.db
      .query("widgets")
      .withIndex("by_widget_id", (q) => q.eq("widgetId", args.widgetId))
      .unique();

    if (!widget?.isActive) {
      throw new Error("Widget not found or inactive");
    }

    const existingWidgetConv = await ctx.db
      .query("widgetConversations")
      .withIndex("by_widget_visitor", (q) =>
        q.eq("widgetId", widget._id).eq("visitorId", args.visitorId)
      )
      .unique();

    if (existingWidgetConv) {
      await ctx.db.patch(existingWidgetConv._id, {
        lastSeenAt: Date.now(),
        metadata: args.metadata ?? existingWidgetConv.metadata,
      });

      return {
        conversationId: existingWidgetConv.conversationId,
        visitorId: args.visitorId,
        isNew: false,
      };
    }

    const now = Date.now();
    const visitorId = args.visitorId || generateVisitorId();

    const conversationId = await ctx.db.insert("supportConversations", {
      organizationId: widget.organizationId,
      userId: `widget_${visitorId}`,
      subject: "Widget conversation",
      status: "open",
      assignedTo: undefined,
      lastMessageAt: now,
      userUnreadCount: 0,
      adminUnreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("widgetConversations", {
      widgetId: widget._id,
      conversationId,
      visitorId,
      metadata: args.metadata,
      lastSeenAt: now,
      createdAt: now,
    });

    return {
      conversationId,
      visitorId,
      isNew: true,
    };
  },
});

export const sendMessage = mutation({
  args: {
    widgetId: v.string(),
    visitorId: v.string(),
    conversationId: v.id("supportConversations"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const widget = await ctx.db
      .query("widgets")
      .withIndex("by_widget_id", (q) => q.eq("widgetId", args.widgetId))
      .unique();

    if (!widget?.isActive) {
      throw new Error("Widget not found or inactive");
    }

    const widgetConv = await ctx.db
      .query("widgetConversations")
      .withIndex("by_widget_visitor", (q) =>
        q.eq("widgetId", widget._id).eq("visitorId", args.visitorId)
      )
      .unique();

    if (!widgetConv || widgetConv.conversationId !== args.conversationId) {
      throw new Error("Conversation not found for this visitor");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const now = Date.now();

    const messageId = await ctx.db.insert("supportMessages", {
      conversationId: args.conversationId,
      senderId: `widget_${args.visitorId}`,
      senderType: "user",
      body: args.body,
      isRead: false,
      createdAt: now,
    });

    const newStatus =
      conversation.status === "awaiting_reply" ? "open" : conversation.status;

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      updatedAt: now,
      adminUnreadCount: conversation.adminUnreadCount + 1,
      status: newStatus,
    });

    await ctx.db.patch(widgetConv._id, {
      lastSeenAt: now,
    });

    return { messageId };
  },
});

export const listMessages = query({
  args: {
    widgetId: v.string(),
    visitorId: v.string(),
    conversationId: v.id("supportConversations"),
  },
  handler: async (ctx, args) => {
    const widget = await ctx.db
      .query("widgets")
      .withIndex("by_widget_id", (q) => q.eq("widgetId", args.widgetId))
      .unique();

    if (!widget?.isActive) {
      return [];
    }

    const widgetConv = await ctx.db
      .query("widgetConversations")
      .withIndex("by_widget_visitor", (q) =>
        q.eq("widgetId", widget._id).eq("visitorId", args.visitorId)
      )
      .unique();

    if (!widgetConv || widgetConv.conversationId !== args.conversationId) {
      return [];
    }

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    messages.sort((a, b) => a.createdAt - b.createdAt);

    return messages.map((msg) => ({
      id: msg._id,
      body: msg.body,
      senderType: msg.senderType,
      isOwnMessage: msg.senderId === `widget_${args.visitorId}`,
      createdAt: msg.createdAt,
    }));
  },
});

export const markMessagesAsRead = mutation({
  args: {
    widgetId: v.string(),
    visitorId: v.string(),
    conversationId: v.id("supportConversations"),
  },
  handler: async (ctx, args) => {
    const widget = await ctx.db
      .query("widgets")
      .withIndex("by_widget_id", (q) => q.eq("widgetId", args.widgetId))
      .unique();

    if (!widget?.isActive) {
      return false;
    }

    const widgetConv = await ctx.db
      .query("widgetConversations")
      .withIndex("by_widget_visitor", (q) =>
        q.eq("widgetId", widget._id).eq("visitorId", args.visitorId)
      )
      .unique();

    if (!widgetConv || widgetConv.conversationId !== args.conversationId) {
      return false;
    }

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const message of messages) {
      if (!message.isRead && message.senderType === "admin") {
        await ctx.db.patch(message._id, { isRead: true });
      }
    }

    await ctx.db.patch(args.conversationId, {
      userUnreadCount: 0,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const getUnreadCount = query({
  args: {
    widgetId: v.string(),
    visitorId: v.string(),
    conversationId: v.id("supportConversations"),
  },
  handler: async (ctx, args) => {
    const widget = await ctx.db
      .query("widgets")
      .withIndex("by_widget_id", (q) => q.eq("widgetId", args.widgetId))
      .unique();

    if (!widget?.isActive) {
      return 0;
    }

    const widgetConv = await ctx.db
      .query("widgetConversations")
      .withIndex("by_widget_visitor", (q) =>
        q.eq("widgetId", widget._id).eq("visitorId", args.visitorId)
      )
      .unique();

    if (!widgetConv || widgetConv.conversationId !== args.conversationId) {
      return 0;
    }

    const conversation = await ctx.db.get(args.conversationId);
    return conversation?.userUnreadCount ?? 0;
  },
});
