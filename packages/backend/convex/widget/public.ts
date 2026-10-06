import { ConvexError, type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, type QueryCtx, query } from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import {
  MAX_EMAIL_LENGTH,
  MAX_URL_LENGTH,
  MAX_USER_AGENT_LENGTH,
  MAX_VISITOR_ID_LENGTH,
} from "../shared/constants";
import { rateLimiter } from "../shared/rate_limits";
import { isValidEmail, validateInputLength } from "../shared/validators";
import { attachmentViewsByMessage } from "../support/attachments";
import {
  appendCustomerMessage,
  createCustomerConversation,
  newGuestCustomer,
  requireMessageBody,
} from "../support/conversation_writes";
import { requestContactConfirmation } from "../support/email/contacts";

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

    const tier = await getOrgTier(ctx, widget.organizationId);

    return {
      autoOpen: settings.autoOpen,
      greetingMessage: settings.greetingMessage,
      hideBranding: org.hideBranding === true && tier === "pro",
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

const conversationMetadataValidator = v.object({
  referrer: v.optional(v.string()),
  url: v.optional(v.string()),
  userAgent: v.optional(v.string()),
});

function clipMetadata(
  metadata: Infer<typeof conversationMetadataValidator>
): Infer<typeof conversationMetadataValidator> {
  return {
    referrer: metadata.referrer?.slice(0, MAX_URL_LENGTH),
    url: metadata.url?.slice(0, MAX_URL_LENGTH),
    userAgent: metadata.userAgent?.slice(0, MAX_USER_AGENT_LENGTH),
  };
}

const visitorArgs = {
  visitorId: v.string(),
  widgetId: v.string(),
};

const findActiveWidget = async (ctx: QueryCtx, widgetId: string) => {
  const widget = await ctx.db
    .query("widgets")
    .withIndex("by_widget_id", (q) => q.eq("widgetId", widgetId))
    .unique();
  return widget?.isActive ? widget : null;
};

const findVisitorThread = async (
  ctx: QueryCtx,
  widget: Doc<"widgets">,
  visitorId: string
) => {
  const widgetConversation = await ctx.db
    .query("widgetConversations")
    .withIndex("by_widget_visitor", (q) =>
      q.eq("widgetId", widget._id).eq("visitorId", visitorId)
    )
    .unique();
  if (!widgetConversation) {
    return null;
  }
  const conversation = await ctx.db.get(widgetConversation.conversationId);
  return conversation ? { conversation, widgetConversation } : null;
};

const findVisitorConversation = async (
  ctx: QueryCtx,
  args: { visitorId: string; widgetId: string }
) => {
  const widget = await findActiveWidget(ctx, args.widgetId);
  if (!widget) {
    return null;
  }
  const thread = await findVisitorThread(ctx, widget, args.visitorId);
  return thread?.conversation ?? null;
};

export const getConversation = query({
  args: visitorArgs,
  handler: async (ctx, args) => {
    const conversation = await findVisitorConversation(ctx, args);
    return conversation
      ? {
          conversationId: conversation._id,
          guestEmail: conversation.guestEmail,
        }
      : null;
  },
});

export const sendMessage = mutation({
  args: {
    ...visitorArgs,
    body: v.string(),
    metadata: v.optional(conversationMetadataValidator),
  },
  handler: async (ctx, args) => {
    validateInputLength(args.visitorId, MAX_VISITOR_ID_LENGTH, "Visitor ID");
    if (!args.visitorId) {
      throw new Error("Visitor ID is required");
    }
    const body = requireMessageBody(args.body);

    const widget = await findActiveWidget(ctx, args.widgetId);
    if (!widget) {
      throw new Error("Widget not found or inactive");
    }

    const visitorKey = `${widget._id}:${args.visitorId}`;
    await rateLimiter.limit(ctx, "widgetMessagePerVisitor", {
      key: visitorKey,
      throws: true,
    });
    await rateLimiter.limit(ctx, "widgetMessagePerWidget", {
      key: widget._id,
      throws: true,
    });

    const now = Date.now();
    const metadata = args.metadata && clipMetadata(args.metadata);
    const thread = await findVisitorThread(ctx, widget, args.visitorId);

    if (thread) {
      const messageId = await appendCustomerMessage(ctx, thread.conversation, {
        body,
        countsAsActivity: true,
        now,
      });
      await ctx.db.patch(thread.widgetConversation._id, {
        lastSeenAt: now,
        metadata: metadata ?? thread.widgetConversation.metadata,
      });
      return { conversationId: thread.conversation._id, messageId };
    }

    await rateLimiter.limit(ctx, "widgetConversationPerVisitor", {
      key: visitorKey,
      throws: true,
    });
    await rateLimiter.limit(ctx, "widgetConversationPerWidget", {
      key: widget._id,
      throws: true,
    });

    const { conversationId, messageId } = await createCustomerConversation(
      ctx,
      {
        body,
        customer: newGuestCustomer(),
        now,
        organizationId: widget.organizationId,
      }
    );

    await ctx.db.insert("widgetConversations", {
      conversationId,
      createdAt: now,
      lastSeenAt: now,
      metadata,
      visitorId: args.visitorId,
      widgetId: widget._id,
    });

    return { conversationId, messageId };
  },
});

export const listMessages = query({
  args: visitorArgs,
  handler: async (ctx, args) => {
    const conversation = await findVisitorConversation(ctx, args);
    if (!conversation) {
      return [];
    }

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .collect();

    const attachments = await attachmentViewsByMessage(ctx, conversation._id);

    return messages.map((message) => ({
      attachments: (attachments.get(message._id) ?? []).map(
        ({ filename, url }) => ({ filename, url })
      ),
      body: message.body,
      createdAt: message.createdAt,
      id: message._id,
      isOwnMessage: message.senderId === conversation.userId,
      senderType: message.senderType,
    }));
  },
});

export const setEmail = mutation({
  args: { ...visitorArgs, email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim();
    if (email.length > MAX_EMAIL_LENGTH || !isValidEmail(email)) {
      throw new ConvexError("Enter a valid email address.");
    }
    const conversation = await findVisitorConversation(ctx, args);
    if (!conversation) {
      throw new Error("Send a message before adding your email");
    }
    await rateLimiter.limit(ctx, "widgetEmailChangePerConversation", {
      key: conversation._id,
      throws: true,
    });
    await ctx.db.patch(conversation._id, { guestEmail: email });
    return await requestContactConfirmation(ctx, {
      email,
      organizationId: conversation.organizationId,
    });
  },
  returns: v.object({ confirmationRequired: v.boolean() }),
});

export const markMessagesAsRead = mutation({
  args: visitorArgs,
  handler: async (ctx, args) => {
    const conversation = await findVisitorConversation(ctx, args);
    if (!conversation) {
      return false;
    }

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .collect();

    await Promise.all(
      messages
        .filter((message) => !message.isRead && message.senderType === "admin")
        .map((message) => ctx.db.patch(message._id, { isRead: true }))
    );

    await ctx.db.patch(conversation._id, {
      updatedAt: Date.now(),
      userUnreadCount: 0,
    });

    return true;
  },
});

export const getUnreadCount = query({
  args: visitorArgs,
  handler: async (ctx, args) => {
    const conversation = await findVisitorConversation(ctx, args);
    return conversation?.userUnreadCount ?? 0;
  },
});
