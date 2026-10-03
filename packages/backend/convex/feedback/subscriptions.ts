import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type MutationCtx, mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { requireAuthUser } from "../shared/access";
import { canViewFeedback } from "./public_projection";

const assertCanSubscribe = async (
  ctx: MutationCtx,
  feedback: Doc<"feedback">
): Promise<void> => {
  if (!(await canViewFeedback(ctx, feedback))) {
    throw new Error("You don't have access to subscribe to this feedback");
  }
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
          subscribedAt: sub.createdAt,
          user: userData
            ? {
                email: userData.email ?? "",
                image: userData.image ?? null,
                name: userData.name ?? null,
              }
            : null,
          userId: sub.userId,
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
    const user = await requireAuthUser(ctx);

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
      // Unsubscribe
      await ctx.db.delete(existingSubscription._id);
      return { subscribed: false };
    }

    await assertCanSubscribe(ctx, feedback);
    await ctx.db.insert("feedbackSubscriptions", {
      createdAt: Date.now(),
      feedbackId: args.feedbackId,
      userId: user._id,
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
    const user = await requireAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    await assertCanSubscribe(ctx, feedback);
    // Check if already subscribed
    const existingSubscription = await ctx.db
      .query("feedbackSubscriptions")
      .withIndex("by_feedback_user", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("userId", user._id)
      )
      .unique();

    if (existingSubscription) {
      return { alreadySubscribed: true, subscribed: true };
    }

    // Subscribe
    await ctx.db.insert("feedbackSubscriptions", {
      createdAt: Date.now(),
      feedbackId: args.feedbackId,
      userId: user._id,
    });

    return { alreadySubscribed: false, subscribed: true };
  },
});

/**
 * Unsubscribe from feedback (idempotent)
 */
export const unsubscribe = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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
