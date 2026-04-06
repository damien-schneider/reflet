import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";

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
          settings,
          conversationCount: conversationCount.length,
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
