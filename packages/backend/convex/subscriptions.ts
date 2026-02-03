import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

// Plan limits for Free vs Pro tiers
export const PLAN_LIMITS = {
  free: {
    maxMembers: 3,
    maxFeedback: 100,
    customBranding: false,
    customDomain: false,
    apiAccess: false,
    prioritySupport: false,
  },
  pro: {
    maxMembers: Number.POSITIVE_INFINITY, // Unlimited
    maxFeedback: 5000,
    customBranding: true,
    customDomain: true,
    apiAccess: true,
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
      tier,
      status: subscription?.status ?? "none",
      subscription: subscription
        ? {
            priceId: subscription.priceId,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            cancelAt: subscription.cancelAt,
          }
        : null,
      limits,
      usage: {
        members: members.length,
        feedback: feedbackCount.length,
      },
      isOwner,
      // Only owner can upgrade/checkout
      canManageBilling: isOwner,
      // All members can view the billing portal
      canViewBilling: true,
    };
  },
});

/**
 * Check if organization can perform an action based on limits
 */
export const checkLimit = query({
  args: {
    organizationId: v.id("organizations"),
    action: v.union(
      v.literal("invite_member"),
      v.literal("create_feedback"),
      v.literal("custom_branding"),
      v.literal("custom_domain"),
      v.literal("api_access")
    ),
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
            reason: `Feedback limit reached (${limits.maxFeedback}). Upgrade to Pro for more.`,
            current: feedbackItems.length,
            limit: limits.maxFeedback,
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
            reason: `Member limit reached (${limits.maxMembers}). Upgrade to Pro for unlimited members.`,
            current: total,
            limit: limits.maxMembers,
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
