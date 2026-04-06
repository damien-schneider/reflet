import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { authComponent } from "../auth/auth";

type AuthCtx = Parameters<typeof authComponent.safeGetAuthUser>[0];

const getAuthUser = async (ctx: AuthCtx) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

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
