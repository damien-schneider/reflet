import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { stripeTimestampToMs } from "./utils";

// Plan limits for Free vs Pro tiers
export const PLAN_LIMITS = {
  free: {
    apiAccess: false,
    customBranding: false,
    customDomain: false,
    maxFeedback: 100,
    maxMembers: 3,
    minCheckIntervalMinutes: 5,
    prioritySupport: false,
  },
  pro: {
    apiAccess: true,
    customBranding: true,
    customDomain: true,
    maxFeedback: 5000,
    maxMembers: Number.POSITIVE_INFINITY, // Unlimited
    minCheckIntervalMinutes: 1,
    prioritySupport: true,
  },
} as const;

type PlanTier = keyof typeof PLAN_LIMITS;

// ============================================
// QUERIES
// ============================================

/**
 * Get subscription status for an organization
 * Uses org-based subscription model (subscription belongs to org, not user)
 */
export const getStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    // Query Stripe component for org's subscription
    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: args.organizationId }
    );

    // Determine tier based on subscription status
    const hasActiveSubscription =
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing");
    const tier: PlanTier = hasActiveSubscription ? "pro" : "free";

    // Get current usage
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const feedbackCount = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const limits = PLAN_LIMITS[tier];
    const isOwner = membership.role === "owner";

    return {
      // Only owner can upgrade/checkout
      canManageBilling: isOwner,
      // All members can view the billing portal
      canViewBilling: true,
      isOwner,
      limits,
      status: subscription?.status ?? "none",
      subscription: subscription
        ? {
            cancelAt: subscription.cancelAt,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: stripeTimestampToMs(
              subscription.currentPeriodEnd
            ),
            priceId: subscription.priceId,
            status: subscription.status,
          }
        : null,
      tier,
      usage: {
        feedback: feedbackCount.length,
        members: members.length,
      },
    };
  },
});

/**
 * Check if organization can perform an action based on limits
 */
export const checkLimit = query({
  args: {
    action: v.union(
      v.literal("invite_member"),
      v.literal("create_feedback"),
      v.literal("custom_branding"),
      v.literal("custom_domain"),
      v.literal("api_access")
    ),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return { allowed: false, reason: "Not authenticated" };
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return { allowed: false, reason: "Organization not found" };
    }

    // Query Stripe component for org's subscription
    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: args.organizationId }
    );

    // Determine tier based on subscription status
    const hasActiveSubscription =
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing");
    const tier: PlanTier = hasActiveSubscription ? "pro" : "free";
    const limits = PLAN_LIMITS[tier];

    switch (args.action) {
      case "create_feedback": {
        const feedbackItems = await ctx.db
          .query("feedback")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", args.organizationId)
          )
          .collect();

        if (feedbackItems.length >= limits.maxFeedback) {
          return {
            allowed: false,
            current: feedbackItems.length,
            limit: limits.maxFeedback,
            reason: `Feedback limit reached (${limits.maxFeedback}). Upgrade to Pro for more.`,
          };
        }
        return { allowed: true };
      }

      case "invite_member": {
        const members = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", args.organizationId)
          )
          .collect();

        const pendingInvites = await ctx.db
          .query("invitations")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", args.organizationId)
          )
          .filter((q) => q.eq(q.field("status"), "pending"))
          .collect();

        const total = members.length + pendingInvites.length;

        if (total >= limits.maxMembers) {
          return {
            allowed: false,
            current: total,
            limit: limits.maxMembers,
            reason: `Member limit reached (${limits.maxMembers}). Upgrade to Pro for unlimited members.`,
          };
        }
        return { allowed: true };
      }

      case "custom_branding": {
        if (!limits.customBranding) {
          return {
            allowed: false,
            reason: "Custom branding is a Pro feature. Upgrade to unlock.",
          };
        }
        return { allowed: true };
      }

      case "custom_domain": {
        if (!limits.customDomain) {
          return {
            allowed: false,
            reason: "Custom domains are a Pro feature. Upgrade to unlock.",
          };
        }
        return { allowed: true };
      }

      case "api_access": {
        if (!limits.apiAccess) {
          return {
            allowed: false,
            reason: "API access is a Pro feature. Upgrade to unlock.",
          };
        }
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  },
});

/**
 * Public query: get plan features for an org without requiring auth.
 * Used by public-facing pages (public board, changelog, widget) that need to
 * know if branding should be hidden. Does NOT expose billing details.
 */
export const getPublicPlanFeatures = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return { hideBranding: false };
    }

    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: args.organizationId }
    );
    const isPro =
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing");

    return {
      hideBranding: org.hideBranding === true && Boolean(isPro),
    };
  },
  returns: v.object({ hideBranding: v.boolean() }),
});
