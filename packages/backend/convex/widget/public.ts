import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { MAX_SUPPORT_MESSAGE_LENGTH } from "../shared/constants";
import { validateInputLength } from "../shared/validators";

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

    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: widget.organizationId }
    );
    const isPro =
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing");

    return {
      autoOpen: settings.autoOpen,
      greetingMessage: settings.greetingMessage,
      hideBranding: org.hideBranding === true && Boolean(isPro),
      organizationName: org.name,
      position: settings.position,
      primaryColor: settings.primaryColor,
      showLauncher: settings.showLauncher,
      welcomeMessage: settings.welcomeMessage,
      widgetId: args.widgetId,
      zIndex: settings.zIndex,
    };
  },
});

export const getOrCreateConversation = mutation({
  args: {
    metadata: v.optional(
      v.object({
        referrer: v.optional(v.string()),
        url: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),
    visitorId: v.string(),
    widgetId: v.string(),
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
        isNew: false,
        visitorId: args.visitorId,
      };
    }

    const now = Date.now();
    const visitorId = args.visitorId || generateVisitorId();

    const conversationId = await ctx.db.insert("supportConversations", {
      adminUnreadCount: 0,
      assignedTo: undefined,
      createdAt: now,
      lastMessageAt: now,
      organizationId: widget.organizationId,
      status: "open",
      subject: "Widget conversation",
      updatedAt: now,
      userId: `widget_${visitorId}`,
      userUnreadCount: 0,
    });

    await ctx.db.insert("widgetConversations", {
      conversationId,
      createdAt: now,
      lastSeenAt: now,
      metadata: args.metadata,
      visitorId,
      widgetId: widget._id,
    });

    return {
      conversationId,
      isNew: true,
      visitorId,
    };
  },
});

export const sendMessage = mutation({
  args: {
    body: v.string(),
    conversationId: v.id("supportConversations"),
    visitorId: v.string(),
    widgetId: v.string(),
  },
  handler: async (ctx, args) => {
    validateInputLength(args.body, MAX_SUPPORT_MESSAGE_LENGTH, "Message");

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
      body: args.body,
      conversationId: args.conversationId,
      createdAt: now,
      isRead: false,
      senderId: `widget_${args.visitorId}`,
      senderType: "user",
    });

    const newStatus =
      conversation.status === "awaiting_reply" ? "open" : conversation.status;

    await ctx.db.patch(args.conversationId, {
      adminUnreadCount: conversation.adminUnreadCount + 1,
      lastMessageAt: now,
      status: newStatus,
      updatedAt: now,
    });

    await ctx.db.patch(widgetConv._id, {
      lastSeenAt: now,
    });

    return { messageId };
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("supportConversations"),
    visitorId: v.string(),
    widgetId: v.string(),
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
      body: msg.body,
      createdAt: msg.createdAt,
      id: msg._id,
      isOwnMessage: msg.senderId === `widget_${args.visitorId}`,
      senderType: msg.senderType,
    }));
  },
});

export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id("supportConversations"),
    visitorId: v.string(),
    widgetId: v.string(),
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
      updatedAt: Date.now(),
      userUnreadCount: 0,
    });

    return true;
  },
});

export const getUnreadCount = query({
  args: {
    conversationId: v.id("supportConversations"),
    visitorId: v.string(),
    widgetId: v.string(),
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
