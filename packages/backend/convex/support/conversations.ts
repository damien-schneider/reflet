import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";

type AuthCtx = Parameters<typeof authComponent.safeGetAuthUser>[0];

const getAuthUser = async (ctx: AuthCtx) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

function formatUserInfo(user: {
  name?: string | null;
  email: string;
  image?: string | null;
}) {
  return {
    name: user.name || undefined,
    email: user.email,
    image: user.image || undefined,
  };
}

function formatGuestUserInfo(guestEmail?: string) {
  return guestEmail
    ? { name: undefined, email: guestEmail, image: undefined }
    : undefined;
}

async function formatAssignedUser(ctx: AuthCtx, assignedTo?: string) {
  if (!assignedTo) {
    return undefined;
  }
  const user = await authComponent.getAnyUserById(ctx, assignedTo);
  if (!user) {
    return undefined;
  }
  return {
    id: user._id,
    name: user.name || undefined,
    email: user.email,
    image: user.image || undefined,
  };
}

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
        const convUser = conv.guestId
          ? null
          : await authComponent.getAnyUserById(ctx, conv.userId);
        return {
          ...conv,
          user: convUser
            ? formatUserInfo(convUser)
            : formatGuestUserInfo(conv.guestEmail),
        };
      })
    );

    return conversationsWithUser;
  },
});

export const listForGuest = query({
  args: {
    organizationId: v.id("organizations"),
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .collect();

    const filtered = conversations.filter(
      (c) => c.organizationId === args.organizationId
    );

    filtered.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    return filtered;
  },
});

export const get = query({
  args: {
    id: v.id("supportConversations"),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    const conversation = await ctx.db.get(args.id);
    if (!conversation) {
      return null;
    }

    // Guest access: verify guestId matches
    if (!user) {
      const isValidGuest =
        args.guestId && conversation.guestId === args.guestId;
      if (!isValidGuest) {
        return null;
      }

      return {
        ...conversation,
        user: formatGuestUserInfo(conversation.guestEmail),
        assignedUser: await formatAssignedUser(ctx, conversation.assignedTo),
        isAdmin: false,
      };
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

    const convUser = conversation.guestId
      ? null
      : await authComponent.getAnyUserById(ctx, conversation.userId);

    return {
      ...conversation,
      user: convUser
        ? formatUserInfo(convUser)
        : formatGuestUserInfo(conversation.guestEmail),
      assignedUser: await formatAssignedUser(ctx, conversation.assignedTo),
      isAdmin,
    };
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    subject: v.optional(v.string()),
    initialMessage: v.string(),
    guestId: v.optional(v.string()),
    guestEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!(user || (args.guestId && args.guestEmail))) {
      throw new Error("Either authentication or guest email is required");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Already validated that either user or guestId exists above
    const senderId = user?._id ?? (args.guestId as string);
    const now = Date.now();

    const conversationId = await ctx.db.insert("supportConversations", {
      organizationId: args.organizationId,
      userId: senderId,
      guestId: user ? undefined : args.guestId,
      guestEmail: user ? undefined : args.guestEmail,
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
      senderId,
      senderType: "user",
      body: args.initialMessage,
      isRead: false,
      createdAt: now,
    });

    // Trigger autopilot support triage if enabled
    const autopilotConfig = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (autopilotConfig?.enabled && autopilotConfig.supportEnabled !== false) {
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.support.runSupportTriage,
        { organizationId: args.organizationId }
      );
    }

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
      const { assignedTo } = args;
      const assigneeMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q
            .eq("organizationId", conversation.organizationId)
            .eq("userId", assignedTo)
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
