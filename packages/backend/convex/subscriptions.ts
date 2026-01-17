import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

// Plan limits (re-export from organizations for convenience)
export const PLAN_LIMITS = {
  free: {
    maxBoards: 1,
    maxMembers: 3,
    maxFeedbackPerBoard: 100,
    customBranding: false,
    apiAccess: false,
  },
  pro: {
    maxBoards: 5,
    maxMembers: 10,
    maxFeedbackPerBoard: 1000,
    customBranding: true,
    apiAccess: true,
  },
} as const;

type PlanTier = keyof typeof PLAN_LIMITS;

// ============================================
// QUERIES
// ============================================

/**
 * Get subscription status for an organization
 * Uses Polar component to get subscription data
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

    // Query Polar component directly for user subscriptions
    const polarSubscriptions = await ctx.runQuery(
      components.polar.lib.listUserSubscriptions,
      { userId: user._id }
    );

    // Find the first active subscription
    const activeSubscription = polarSubscriptions.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    // Get product info to determine tier
    let productKey: string | undefined;
    if (activeSubscription) {
      const products = await ctx.runQuery(
        components.polar.lib.listProducts,
        {}
      );
      const product = products.find(
        (p) => p.id === activeSubscription.productId
      );
      // Check if it's a Pro product by matching product ID
      const proMonthlyId = process.env.POLAR_PRODUCT_PRO_MONTHLY;
      const proYearlyId = process.env.POLAR_PRODUCT_PRO_YEARLY;
      if (product) {
        if (product.id === proMonthlyId) {
          productKey = "proMonthly";
        } else if (product.id === proYearlyId) {
          productKey = "proYearly";
        }
      }
    }

    // Determine tier based on subscription
    const hasPro = productKey === "proMonthly" || productKey === "proYearly";
    const tier: PlanTier = hasPro ? "pro" : "free";
    const status = activeSubscription?.status ?? "none";

    // Get current usage
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const limits = PLAN_LIMITS[tier];

    return {
      tier,
      status,
      subscription: activeSubscription
        ? {
            productKey,
            status: activeSubscription.status,
            currentPeriodStart: activeSubscription.currentPeriodStart
              ? new Date(activeSubscription.currentPeriodStart).getTime()
              : undefined,
            currentPeriodEnd: activeSubscription.currentPeriodEnd
              ? new Date(activeSubscription.currentPeriodEnd).getTime()
              : undefined,
            cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
          }
        : null,
      limits,
      usage: {
        boards: boards.length,
        members: members.length,
      },
      isOwner: membership.role === "owner",
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
      v.literal("create_board"),
      v.literal("invite_member"),
      v.literal("create_feedback"),
      v.literal("custom_branding")
    ),
    boardId: v.optional(v.id("boards")),
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

    // Query Polar component directly for user subscriptions
    const polarSubscriptions = await ctx.runQuery(
      components.polar.lib.listUserSubscriptions,
      { userId: user._id }
    );

    // Find the first active subscription
    const activeSubscription = polarSubscriptions.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    // Get product info to determine tier
    let productKey: string | undefined;
    if (activeSubscription) {
      const proMonthlyId = process.env.POLAR_PRODUCT_PRO_MONTHLY;
      const proYearlyId = process.env.POLAR_PRODUCT_PRO_YEARLY;
      if (activeSubscription.productId === proMonthlyId) {
        productKey = "proMonthly";
      } else if (activeSubscription.productId === proYearlyId) {
        productKey = "proYearly";
      }
    }

    // Determine tier based on subscription
    const hasPro = productKey === "proMonthly" || productKey === "proYearly";
    const tier: PlanTier = hasPro ? "pro" : "free";
    const limits = PLAN_LIMITS[tier];

    switch (args.action) {
      case "create_board": {
        const boards = await ctx.db
          .query("boards")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", args.organizationId)
          )
          .collect();

        if (boards.length >= limits.maxBoards) {
          return {
            allowed: false,
            reason: `Board limit reached (${limits.maxBoards}). Upgrade to Pro for more boards.`,
            current: boards.length,
            limit: limits.maxBoards,
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
            reason: `Member limit reached (${limits.maxMembers}). Upgrade to Pro for more members.`,
            current: total,
            limit: limits.maxMembers,
          };
        }
        return { allowed: true };
      }

      case "create_feedback": {
        const boardId = args.boardId;
        if (!boardId) {
          return { allowed: false, reason: "Board ID required" };
        }

        const feedback = await ctx.db
          .query("feedback")
          .withIndex("by_board", (q) => q.eq("boardId", boardId))
          .collect();

        if (feedback.length >= limits.maxFeedbackPerBoard) {
          return {
            allowed: false,
            reason: `Feedback limit reached (${limits.maxFeedbackPerBoard}). Upgrade to Pro for more feedback items.`,
            current: feedback.length,
            limit: limits.maxFeedbackPerBoard,
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

      default:
        return { allowed: true };
    }
  },
});
