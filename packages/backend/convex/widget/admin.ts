import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";

function generateWidgetId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const getAuthUser = async (
  ctx: Parameters<typeof authComponent.safeGetAuthUser>[0]
) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

export const list = query({
  args: {
    organizationId: v.id("organizations"),
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

    const widgets = await ctx.db
      .query("widgets")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const widgetsWithSettings = await Promise.all(
      widgets.map(async (widget) => {
        const settings = await ctx.db
          .query("widgetSettings")
          .withIndex("by_widget", (q) => q.eq("widgetId", widget._id))
          .unique();

        const conversationCount = await ctx.db
          .query("widgetConversations")
          .withIndex("by_widget_visitor", (q) => q.eq("widgetId", widget._id))
          .collect();

        return {
          ...widget,
          conversationCount: conversationCount.length,
          settings,
        };
      })
    );

    widgetsWithSettings.sort((a, b) => b.createdAt - a.createdAt);

    return widgetsWithSettings;
  },
});

export const get = query({
  args: {
    widgetId: v.id("widgets"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const widget = await ctx.db.get(args.widgetId);
    if (!widget) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", widget.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return null;
    }

    const settings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_widget", (q) => q.eq("widgetId", widget._id))
      .unique();

    return {
      ...widget,
      settings,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    organizationId: v.id("organizations"),
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
      throw new Error("Only admins can manage widgets");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const now = Date.now();
    let widgetId = generateWidgetId();

    const existingWidget = await ctx.db
      .query("widgets")
      .withIndex("by_widget_id", (q) => q.eq("widgetId", widgetId))
      .unique();

    if (existingWidget) {
      widgetId = generateWidgetId();
    }

    const id = await ctx.db.insert("widgets", {
      createdAt: now,
      isActive: true,
      name: args.name,
      organizationId: args.organizationId,
      updatedAt: now,
      widgetId,
    });

    await ctx.db.insert("widgetSettings", {
      autoOpen: false,
      greetingMessage: "We typically reply within a few hours",
      position: "bottom-right",
      primaryColor: org.primaryColor ?? "#5c6d4f",
      showLauncher: true,
      welcomeMessage: "Hi there! How can we help you?",
      widgetId: id,
      zIndex: 9999,
    });

    return { id, widgetId };
  },
});

export const update = mutation({
  args: {
    isActive: v.optional(v.boolean()),
    name: v.optional(v.string()),
    widgetId: v.id("widgets"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const widget = await ctx.db.get(args.widgetId);
    if (!widget) {
      throw new Error("Widget not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", widget.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can manage widgets");
    }

    const updates: { name?: string; isActive?: boolean; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }

    await ctx.db.patch(args.widgetId, updates);

    return args.widgetId;
  },
});

export const getWidgetConversations = query({
  args: {
    widgetId: v.id("widgets"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const widget = await ctx.db.get(args.widgetId);
    if (!widget) {
      return [];
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", widget.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    const widgetConversations = await ctx.db
      .query("widgetConversations")
      .withIndex("by_widget_visitor", (q) => q.eq("widgetId", args.widgetId))
      .collect();

    const conversationsWithDetails = await Promise.all(
      widgetConversations.map(async (wc) => {
        const conversation = await ctx.db.get(wc.conversationId);
        return {
          ...wc,
          conversation,
        };
      })
    );

    conversationsWithDetails.sort(
      (a, b) =>
        (b.conversation?.lastMessageAt ?? 0) -
        (a.conversation?.lastMessageAt ?? 0)
    );

    return conversationsWithDetails;
  },
});
