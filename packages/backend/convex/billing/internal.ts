import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Get membership for a user in an organization
 * Internal query used by subscription actions
 */
export const getMembershipForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .unique();
  },
});

/**
 * Get organization by ID
 * Internal query used by subscription actions
 */
export const getOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

/**
 * Set Stripe customer ID on an organization
 * Internal mutation used when creating a new Stripe customer
 */
export const setOrgStripeCustomer = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

/**
 * Update organization subscription status
 * Called by webhook handlers when subscription status changes
 */
export const updateOrgSubscriptionStatus = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subscriptionTier: v.union(v.literal("free"), v.literal("pro")),
    subscriptionStatus: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("none")
    ),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      subscriptionTier: args.subscriptionTier,
      subscriptionStatus: args.subscriptionStatus,
      stripeSubscriptionId: args.stripeSubscriptionId,
    });
  },
});

/**
 * Get the effective subscription tier for an organization based on real-time Stripe data.
 * This is the source of truth for feature gating — do NOT use org.subscriptionTier directly.
 */
export const getOrgEffectiveTier = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.union(v.literal("free"), v.literal("pro")),
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: args.organizationId }
    );
    const hasActiveSubscription =
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing");
    return hasActiveSubscription ? "pro" : "free";
  },
});
