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
