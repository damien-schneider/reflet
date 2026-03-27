import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================
// QUERIES
// ============================================

export const getSubscriberCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const subscribers = await ctx.db
      .query("statusSubscribers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return subscribers.length;
  },
});

// ============================================
// MUTATIONS
// ============================================

export const subscribe = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for existing subscription
    const existing = await ctx.db
      .query("statusSubscribers")
      .withIndex("by_email_org", (q) =>
        q.eq("email", args.email).eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      return { alreadySubscribed: true };
    }

    const token = crypto.randomUUID();

    await ctx.db.insert("statusSubscribers", {
      organizationId: args.organizationId,
      email: args.email,
      unsubscribeToken: token,
      subscribedAt: Date.now(),
    });

    return { alreadySubscribed: false };
  },
});

export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("statusSubscribers")
      .withIndex("by_unsubscribe_token", (q) =>
        q.eq("unsubscribeToken", args.token)
      )
      .unique();

    if (!subscriber) {
      return { success: false };
    }

    await ctx.db.delete(subscriber._id);
    return { success: true };
  },
});
