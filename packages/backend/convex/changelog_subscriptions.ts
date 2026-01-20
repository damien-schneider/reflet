import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getAuthUser } from "./utils";
import { isValidEmail } from "./validators";

/**
 * Check if user is subscribed to changelog
 */
export const isSubscribed = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return false;
    }

    const subscription = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .unique();

    return !!subscription;
  },
});

/**
 * Subscribe to changelog updates
 */
export const subscribe = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check if already subscribed
    const existing = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const subscriberId = await ctx.db.insert("changelogSubscribers", {
      userId: user._id,
      organizationId: args.organizationId,
      subscribedAt: Date.now(),
    });

    return subscriberId;
  },
});

/**
 * Unsubscribe from changelog updates
 */
export const unsubscribe = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const subscription = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .unique();

    if (subscription) {
      await ctx.db.delete(subscription._id);
    }

    return true;
  },
});

/**
 * Subscribe to changelog by email (for anonymous users)
 */
export const subscribeByEmail = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isValidEmail(args.email)) {
      throw new Error("Invalid email address");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check if already subscribed by email
    const existing = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_email_org", (q) =>
        q
          .eq("email", args.email.toLowerCase())
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    const subscriberId = await ctx.db.insert("changelogSubscribers", {
      email: args.email.toLowerCase(),
      organizationId: args.organizationId,
      subscribedAt: Date.now(),
    });

    return subscriberId;
  },
});
