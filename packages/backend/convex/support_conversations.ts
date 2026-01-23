import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const getAuthUser = async (ctx: { auth: unknown }) => {
  const user = await authComponent.safeGetAuthUser(
    ctx as Parameters<typeof authComponent.safeGetAuthUser>[0]
  );
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

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

    conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    return conversations;
  },
});

export const listForAdmin = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.array(
        v.union(
          v.literal("open"),
          v.literal("awaiting_reply"),
          v.literal("resolved"),
          v.literal("closed")
        )
      )
    ),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    let conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (args.status && args.status.length > 0) {
      conversations = conversations.filter((c) =>
        args.status?.includes(c.status)
      );
    }

    if (args.assignedTo) {
      conversations = conversations.filter(
        (c) => c.assignedTo === args.assignedTo
      );
    }

    conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    const conversationsWithUser = await Promise.all(
      conversations.map(async (conv) => {
        const convUser = await authComponent.getAnyUserById(ctx, conv.userId);
        return {
          ...conv,
          user: convUser
            ? {
                name: convUser.name || undefined,
                email: convUser.email,
                image: convUser.image || undefined,
              }
            : undefined,
        };
      })
    );

    return conversationsWithUser;
  },
});

export const get = query({
  args: { id: v.id("supportConversations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const conversation = await ctx.db.get(args.id);
    if (!conversation) {
      return null;
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
      return null;
    }

    const convUser = await authComponent.getAnyUserById(
      ctx,
      conversation.userId
    );
    const assignedUser = conversation.assignedTo
      ? await authComponent.getAnyUserById(ctx, conversation.assignedTo)
      : null;

    return {
      ...conversation,
      user: convUser
        ? {
            name: convUser.name || undefined,
            email: convUser.email,
            image: convUser.image || undefined,
          }
        : undefined,
      assignedUser: assignedUser
        ? {
            id: assignedUser._id,
            name: assignedUser.name || undefined,
            email: assignedUser.email,
            image: assignedUser.image || undefined,
          }
        : undefined,
      isAdmin,
    };
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    subject: v.optional(v.string()),
    initialMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const now = Date.now();

    const conversationId = await ctx.db.insert("supportConversations", {
      organizationId: args.organizationId,
      userId: user._id,
      subject: args.subject,
      status: "open",
      assignedTo: undefined,
      lastMessageAt: now,
      userUnreadCount: 0,
      adminUnreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("supportMessages", {
      conversationId,
      senderId: user._id,
      senderType: "user",
      body: args.initialMessage,
      isRead: false,
      createdAt: now,
    });

    return conversationId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("supportConversations"),
    status: v.union(
      v.literal("open"),
      v.literal("awaiting_reply"),
      v.literal("resolved"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const conversation = await ctx.db.get(args.id);
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update conversation status");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const assign = mutation({
  args: {
    id: v.id("supportConversations"),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const conversation = await ctx.db.get(args.id);
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can assign conversations");
    }

    if (args.assignedTo) {
      const assigneeMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q
            .eq("organizationId", conversation.organizationId)
            .eq("userId", args.assignedTo as string)
        )
        .unique();

      if (!assigneeMembership) {
        throw new Error("Assignee is not a member of this organization");
      }
    }

    await ctx.db.patch(args.id, {
      assignedTo: args.assignedTo,
      updatedAt: Date.now(),
    });

    return args.id;
  },
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
});

export const getUnreadCountForAdmin = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 0;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return 0;
    }

    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return conversations.reduce((acc, conv) => acc + conv.adminUnreadCount, 0);
  },
});

export const getSupportSettings = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    return {
      supportEnabled: org.supportEnabled ?? false,
    };
  },
});

export const updateSupportSettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    supportEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update support settings");
    }

    await ctx.db.patch(args.organizationId, {
      supportEnabled: args.supportEnabled,
    });

    return args.organizationId;
  },
});
