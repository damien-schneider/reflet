import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { STRIPE_PRICES, stripeClient } from "./stripe";
import { getAuthUser } from "./utils";

// ============================================
// ACTIONS - Org-based subscription management
// Only the organization owner can manage billing
// ============================================

/**
 * Create a Stripe Checkout session for subscription
 * Only the org owner can upgrade the organization
 */
export const createCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    priceKey: v.union(v.literal("proMonthly"), v.literal("proYearly")),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify user is the owner of this organization
    const membership = await ctx.runQuery(
      internal.subscriptions_internal.getMembershipForOrg,
      {
        organizationId: args.organizationId,
        userId: user._id,
      }
    );

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role !== "owner") {
      throw new Error("Only the organization owner can manage billing");
    }

    // Get org details
    const org = await ctx.runQuery(internal.subscriptions_internal.getOrg, {
      organizationId: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get price ID based on the selected plan
    const priceId = STRIPE_PRICES[args.priceKey];
    if (!priceId) {
      throw new Error(
        `Invalid price key: ${args.priceKey}. Check STRIPE_PRICE_PRO_MONTHLY and STRIPE_PRICE_PRO_YEARLY environment variables.`
      );
    }

    // Get or create Stripe customer for this ORGANIZATION
    // We use the org ID as the identifier, with owner's email as contact
    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const result = await stripeClient.getOrCreateCustomer(ctx, {
        // Use org ID as the customer identifier (not user ID)
        userId: args.organizationId,
        email: user.email,
        name: org.name,
      });
      customerId = result.customerId;

      // Store customerId on the org
      await ctx.runMutation(
        internal.subscriptions_internal.setOrgStripeCustomer,
        {
          organizationId: args.organizationId,
          stripeCustomerId: customerId,
        }
      );
    }

    // Create checkout session with orgId in metadata
    const result = await stripeClient.createCheckoutSession(ctx, {
      priceId,
      customerId,
      mode: "subscription",
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      metadata: {
        orgId: args.organizationId,
      },
      subscriptionMetadata: {
        orgId: args.organizationId,
      },
    });

    return {
      sessionId: result.sessionId,
      url: result.url,
    };
  },
});

/**
 * Create a Stripe Customer Portal session for managing billing
 * Any org member can access the billing portal to view subscription details
 */
export const createCustomerPortalSession = action({
  args: {
    organizationId: v.id("organizations"),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify user is a member of this organization
    const membership = await ctx.runQuery(
      internal.subscriptions_internal.getMembershipForOrg,
      {
        organizationId: args.organizationId,
        userId: user._id,
      }
    );

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Get org to find Stripe customer ID
    const org = await ctx.runQuery(internal.subscriptions_internal.getOrg, {
      organizationId: args.organizationId,
    });

    if (!org?.stripeCustomerId) {
      throw new Error("No billing account found. Please subscribe first.");
    }

    // Create customer portal session
    const result = await stripeClient.createCustomerPortalSession(ctx, {
      customerId: org.stripeCustomerId,
      returnUrl: args.returnUrl,
    });

    return {
      url: result.url,
    };
  },
});

/**
 * Cancel the organization's subscription
 * Only the org owner can cancel
 */
export const cancelSubscription = action({
  args: {
    organizationId: v.id("organizations"),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify user is the owner
    const membership = await ctx.runQuery(
      internal.subscriptions_internal.getMembershipForOrg,
      {
        organizationId: args.organizationId,
        userId: user._id,
      }
    );

    if (!membership || membership.role !== "owner") {
      throw new Error(
        "Only the organization owner can cancel the subscription"
      );
    }

    // Get org's subscription
    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: args.organizationId }
    );

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    await stripeClient.cancelSubscription(ctx, {
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? true,
    });

    return { success: true };
  },
});

/**
 * Reactivate a subscription that was set to cancel at period end
 * Only the org owner can reactivate
 */
export const reactivateSubscription = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify user is the owner
    const membership = await ctx.runQuery(
      internal.subscriptions_internal.getMembershipForOrg,
      {
        organizationId: args.organizationId,
        userId: user._id,
      }
    );

    if (!membership || membership.role !== "owner") {
      throw new Error(
        "Only the organization owner can reactivate the subscription"
      );
    }

    // Get org's subscription
    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: args.organizationId }
    );

    if (!subscription) {
      throw new Error("No subscription found");
    }

    await stripeClient.reactivateSubscription(ctx, {
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    });

    return { success: true };
  },
});
