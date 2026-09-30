import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth/auth";
import { notificationTables } from "./tableFields";

const PUSH_SERVICE_HOSTS: Record<string, true> = {
  "fcm.googleapis.com": true,
  "updates.push.services.mozilla.com": true,
  "web.push.apple.com": true,
};
const WINDOWS_PUSH_HOST_SUFFIX = ".notify.windows.com";

export const isAllowedPushEndpoint = (endpoint: string): boolean => {
  if (!URL.canParse(endpoint)) {
    return false;
  }
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.port !== "" || url.username !== "") {
    return false;
  }
  return (
    PUSH_SERVICE_HOSTS[url.hostname] === true ||
    url.hostname.endsWith(WINDOWS_PUSH_HOST_SUFFIX)
  );
};

export const subscribe = mutation({
  args: {
    auth: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    if (!isAllowedPushEndpoint(args.endpoint)) {
      throw new Error("Unsupported push endpoint");
    }

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      if (existing.userId !== user._id) {
        throw new Error("Push endpoint is registered to another user");
      }
      await ctx.db.patch(existing._id, {
        auth: args.auth,
        p256dh: args.p256dh,
        userAgent: args.userAgent,
      });
      return existing._id;
    }

    return await ctx.db.insert("pushSubscriptions", {
      auth: args.auth,
      createdAt: Date.now(),
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      userAgent: args.userAgent,
      userId: user._id,
    });
  },
  returns: v.id("pushSubscriptions"),
});

export const unsubscribe = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (subscription && subscription.userId === user._id) {
      await ctx.db.delete(subscription._id);
    }
    return null;
  },
  returns: v.null(),
});

export const getUserSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return subscriptions.map((sub) => ({
      _id: sub._id,
      createdAt: sub.createdAt,
      endpoint: sub.endpoint,
      userAgent: sub.userAgent,
    }));
  },
  returns: v.array(
    v.object({
      _id: v.id("pushSubscriptions"),
      createdAt: v.number(),
      endpoint: v.string(),
      userAgent: v.optional(v.string()),
    })
  ),
});

export const getSubscriptionsForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return subscriptions.map(({ _id, auth, endpoint, p256dh }) => ({
      _id,
      auth,
      endpoint,
      p256dh,
    }));
  },
  returns: v.array(
    v.object({
      _id: v.id("pushSubscriptions"),
      auth: v.string(),
      endpoint: v.string(),
      p256dh: v.string(),
    })
  ),
});

export const getPreferencesForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("userNotificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first(),
  returns: v.union(
    v.null(),
    v.object({
      ...notificationTables.userNotificationPreferences.validator.fields,
      _creationTime: v.number(),
      _id: v.id("userNotificationPreferences"),
    })
  ),
});

export const removeSubscription = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId);
    return null;
  },
  returns: v.null(),
});
