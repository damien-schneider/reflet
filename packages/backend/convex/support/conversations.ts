import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import {
  MAX_SUPPORT_MESSAGE_LENGTH,
  MAX_SUPPORT_SUBJECT_LENGTH,
} from "../shared/constants";
import { isValidEmail, validateInputLength } from "../shared/validators";
import { resolveConversationAccess } from "./access";
import { resolveAssignedUser, resolveConversationPerson } from "./people";
import {
  buildMessagePreview,
  supportConversationDetail,
  supportConversationDoc,
} from "./validators";

const byMostRecent = (
  a: { lastMessageAt: number },
  b: { lastMessageAt: number }
) => b.lastMessageAt - a.lastMessageAt;

export const listForUser = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .collect();

    return conversations.sort(byMostRecent);
  },
  returns: v.array(supportConversationDoc),
});

export const listForGuest = query({
  args: {
    guestId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .collect();

    return conversations
      .filter((c) => c.organizationId === args.organizationId)
      .sort(byMostRecent);
  },
  returns: v.array(supportConversationDoc),
});

export const getUnreadCountForUser = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 0;
    }

    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .collect();

    return conversations.reduce((acc, conv) => acc + conv.userUnreadCount, 0);
  },
  returns: v.number(),
});

export const get = query({
  args: {
    guestId: v.optional(v.string()),
    id: v.id("supportConversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.id);
    if (!conversation) {
      return null;
    }

    const access = await resolveConversationAccess(
      ctx,
      conversation,
      args.guestId
    );
    if (!access) {
      return null;
    }

    return {
      ...conversation,
      assignedUser: access.isAdmin
        ? await resolveAssignedUser(ctx, conversation.assignedTo)
        : undefined,
      isAdmin: access.isAdmin,
      user: await resolveConversationPerson(ctx, conversation),
    };
  },
  returns: v.union(supportConversationDetail, v.null()),
});

export const create = mutation({
  args: {
    guestEmail: v.optional(v.string()),
    guestId: v.optional(v.string()),
    initialMessage: v.string(),
    organizationId: v.id("organizations"),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const guest =
      args.guestId && args.guestEmail
        ? { email: args.guestEmail, id: args.guestId }
        : null;

    if (!(user || guest)) {
      throw new Error("Either authentication or guest email is required");
    }
    if (guest && !isValidEmail(guest.email)) {
      throw new Error("A valid guest email is required");
    }

    const body = args.initialMessage.trim();
    if (!body) {
      throw new Error("Message cannot be empty");
    }
    validateInputLength(body, MAX_SUPPORT_MESSAGE_LENGTH, "Message");
    validateInputLength(args.subject, MAX_SUPPORT_SUBJECT_LENGTH, "Subject");

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }
    if (!org.supportEnabled) {
      throw new Error("Support is not enabled for this organization");
    }

    const senderId = user?._id ?? guest?.id;
    if (!senderId) {
      throw new Error("Either authentication or guest email is required");
    }

    const now = Date.now();

    const conversationId = await ctx.db.insert("supportConversations", {
      adminUnreadCount: 1,
      assignedTo: undefined,
      createdAt: now,
      guestEmail: user ? undefined : guest?.email,
      guestId: user ? undefined : guest?.id,
      lastMessageAt: now,
      lastMessagePreview: buildMessagePreview(body),
      organizationId: args.organizationId,
      status: "open",
      subject: args.subject?.trim() || undefined,
      updatedAt: now,
      userId: senderId,
      userUnreadCount: 0,
    });

    await ctx.db.insert("supportMessages", {
      body,
      conversationId,
      createdAt: now,
      isRead: false,
      senderId,
      senderType: "user",
    });

    return conversationId;
  },
  returns: v.id("supportConversations"),
});
