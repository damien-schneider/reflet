import { StripeSubscriptions } from "@convex-dev/stripe";
import { components } from "./_generated/api";

/**
 * Stripe client for managing subscriptions and billing
 *
 * Environment variables required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)
 * - STRIPE_WEBHOOK_SECRET: Your Stripe webhook signing secret (whsec_...)
 *
 * Price configuration:
 * - STRIPE_PRICE_PRO_MONTHLY: Stripe price ID for monthly Pro subscription
 * - STRIPE_PRICE_PRO_YEARLY: Stripe price ID for yearly Pro subscription
 */
export const stripeClient = new StripeSubscriptions(components.stripe, {});

export const STRIPE_PRICES = {
  proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  proYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
} as const;
