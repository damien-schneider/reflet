import { v } from "convex/values";
import { mutation } from "../_generated/server";
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

export const updateSettings = mutation({
  args: {
    autoOpen: v.optional(v.boolean()),
    greetingMessage: v.optional(v.string()),
    position: v.optional(
      v.union(v.literal("bottom-right"), v.literal("bottom-left"))
    ),
    primaryColor: v.optional(v.string()),
    showLauncher: v.optional(v.boolean()),
    welcomeMessage: v.optional(v.string()),
    widgetId: v.id("widgets"),
    zIndex: v.optional(v.number()),
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

    const settings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_widget", (q) => q.eq("widgetId", args.widgetId))
      .unique();

    if (!settings) {
      throw new Error("Widget settings not found");
    }

    const updates: {
      primaryColor?: string;
      position?: "bottom-right" | "bottom-left";
      welcomeMessage?: string;
      greetingMessage?: string;
      showLauncher?: boolean;
      autoOpen?: boolean;
      zIndex?: number;
    } = {};

    if (args.primaryColor !== undefined) {
      updates.primaryColor = args.primaryColor;
    }
    if (args.position !== undefined) {
      updates.position = args.position;
    }
    if (args.welcomeMessage !== undefined) {
      updates.welcomeMessage = args.welcomeMessage;
    }
    if (args.greetingMessage !== undefined) {
      updates.greetingMessage = args.greetingMessage;
    }
    if (args.showLauncher !== undefined) {
      updates.showLauncher = args.showLauncher;
    }
    if (args.autoOpen !== undefined) {
      updates.autoOpen = args.autoOpen;
    }
    if (args.zIndex !== undefined) {
      updates.zIndex = args.zIndex;
    }

    await ctx.db.patch(settings._id, updates);

    return settings._id;
  },
});

export const remove = mutation({
  args: {
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

    const settings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_widget", (q) => q.eq("widgetId", args.widgetId))
      .unique();

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    const widgetConversations = await ctx.db
      .query("widgetConversations")
      .withIndex("by_widget_visitor", (q) => q.eq("widgetId", args.widgetId))
      .collect();

    for (const wc of widgetConversations) {
      await ctx.db.delete(wc._id);
    }

    await ctx.db.delete(args.widgetId);

    return true;
  },
});

export const regenerateWidgetId = mutation({
  args: {
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

    let newWidgetId = generateWidgetId();

    const existingWidget = await ctx.db
      .query("widgets")
      .withIndex("by_widget_id", (q) => q.eq("widgetId", newWidgetId))
      .unique();

    if (existingWidget) {
      newWidgetId = generateWidgetId();
    }

    await ctx.db.patch(args.widgetId, {
      updatedAt: Date.now(),
      widgetId: newWidgetId,
    });

    return { widgetId: newWidgetId };
  },
});
