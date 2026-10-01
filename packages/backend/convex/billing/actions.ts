import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { getOrgSubscription } from "./org_subscription";
import {
  createCheckoutSessionWithPromoCodes,
  STRIPE_PRICES,
  stripeClient,
} from "./stripe";

export const createCheckoutSession = action({
  args: {
    cancelUrl: v.string(),
    organizationId: v.id("organizations"),
    priceKey: v.union(v.literal("proMonthly"), v.literal("proYearly")),
    successUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.runQuery(
      internal.shared.access.membershipForUser,
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

    const org = await ctx.runQuery(internal.billing.internal.getOrg, {
      organizationId: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const priceId = STRIPE_PRICES[args.priceKey];
    if (!priceId) {
      throw new Error(
        `Invalid price key: ${args.priceKey}. Check STRIPE_PRICE_PRO_MONTHLY and STRIPE_PRICE_PRO_YEARLY environment variables.`
      );
    }

    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const result = await stripeClient.getOrCreateCustomer(ctx, {
        email: user.email,
        name: org.name,
        userId: args.organizationId,
      });
      customerId = result.customerId;

      await ctx.runMutation(internal.billing.internal.setOrgStripeCustomer, {
        organizationId: args.organizationId,
        stripeCustomerId: customerId,
      });
    }

    const result = await createCheckoutSessionWithPromoCodes({
      cancelUrl: args.cancelUrl,
      customerId,
      orgId: args.organizationId,
      priceId,
      successUrl: args.successUrl,
    });

    return {
      sessionId: result.sessionId,
      url: result.url,
    };
  },
});

export const createCustomerPortalSession = action({
  args: {
    organizationId: v.id("organizations"),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.runQuery(
      internal.shared.access.membershipForUser,
      {
        organizationId: args.organizationId,
        userId: user._id,
      }
    );

    if (membership?.role !== "owner") {
      throw new Error("Only the organization owner can manage billing");
    }

    const org = await ctx.runQuery(internal.billing.internal.getOrg, {
      organizationId: args.organizationId,
    });

    if (!org?.stripeCustomerId) {
      throw new Error("No billing account found. Please subscribe first.");
    }

    const result = await stripeClient.createCustomerPortalSession(ctx, {
      customerId: org.stripeCustomerId,
      returnUrl: args.returnUrl,
    });

    return {
      url: result.url,
    };
  },
});

export const cancelSubscription = action({
  args: {
    cancelAtPeriodEnd: v.optional(v.boolean()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.runQuery(
      internal.shared.access.membershipForUser,
      {
        organizationId: args.organizationId,
        userId: user._id,
      }
    );

    if (membership?.role !== "owner") {
      throw new Error(
        "Only the organization owner can cancel the subscription"
      );
    }

    const subscription = await getOrgSubscription(ctx, args.organizationId);

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    await stripeClient.cancelSubscription(ctx, {
      cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? true,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    });

    return { success: true };
  },
});

export const reactivateSubscription = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.runQuery(
      internal.shared.access.membershipForUser,
      {
        organizationId: args.organizationId,
        userId: user._id,
      }
    );

    if (membership?.role !== "owner") {
      throw new Error(
        "Only the organization owner can reactivate the subscription"
      );
    }

    const subscription = await getOrgSubscription(ctx, args.organizationId);

    if (!subscription) {
      throw new Error("No subscription found");
    }

    await stripeClient.reactivateSubscription(ctx, {
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    });

    return { success: true };
  },
});
