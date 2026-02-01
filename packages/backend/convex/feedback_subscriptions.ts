import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Helper to get authenticated user
const getAuthUser = async (ctx: { auth: unknown }) => {
  const user = await authComponent.safeGetAuthUser(
    ctx as Parameters<typeof authComponent.safeGetAuthUser>[0]
  );
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

// ============================================
// QUERIES
// ============================================

/**
 * Check if current user is subscribed to a feedback
 */
export const isSubscribed = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return false;
    }

    const subscription = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    return !!subscription;
  },
});

/**
 * Get subscriber count for a feedback
 */
export const getSubscriberCount = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    return subscriptions.length;
  },
});

/**
 * Get all subscribers for a feedback (admin only)
 */
export const getSubscribers = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return [];
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    const subscriptions = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    // Get user info for each subscriber
    const subscribers = await Promise.all(
      subscriptions.map(async (sub) => {
        const userData = sub.userId
          ? await authComponent.getAnyUserById(ctx, sub.userId)
          : null;
        return {
          id: sub._id,
          userId: sub.userId,
          subscribedAt: sub.createdAt,
          user: userData
            ? {
                name: userData.name ?? null,
                email: userData.email ?? "",
                image: userData.image ?? null,
              }
            : null,
        };
      })
    );

    return subscribers;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Toggle subscription for feedback
 */
export const toggle = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const org = await ctx.db.get(feedback.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check access - member or public org
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    const isMember = !!membership;

    if (!(isMember || org.isPublic)) {
      throw new Error("You don't have access to subscribe to this feedback");
    }

    // Check if already subscribed
    const existingSubscription = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    if (existingSubscription) {
      // Unsubscribe
      await ctx.db.delete(existingSubscription._id);
      return { subscribed: false };
    }

    // Subscribe
    await ctx.db.insert("feedbackSubscriptions", {
      feedbackId: args.feedbackId,
      userId: user._id,
      createdAt: Date.now(),
    });

    return { subscribed: true };
  },
});

/**
 * Subscribe to feedback (idempotent)
 */
export const subscribe = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check if already subscribed
    const existingSubscription = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    if (existingSubscription) {
      return { subscribed: true, alreadySubscribed: true };
    }

    // Subscribe
    await ctx.db.insert("feedbackSubscriptions", {
      feedbackId: args.feedbackId,
      userId: user._id,
      createdAt: Date.now(),
    });

    return { subscribed: true, alreadySubscribed: false };
  },
});

/**
 * Unsubscribe from feedback (idempotent)
 */
export const unsubscribe = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const existingSubscription = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    if (existingSubscription) {
      await ctx.db.delete(existingSubscription._id);
      return { unsubscribed: true };
    }

    return { unsubscribed: false };
  },
});
