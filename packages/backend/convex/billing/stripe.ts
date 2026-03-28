import { StripeSubscriptions } from "@convex-dev/stripe";
import Stripe from "stripe";
import { components } from "../_generated/api";

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
export const stripeClient = new StripeSubscriptions(
  // biome-ignore lint/suspicious/noExplicitAny: @convex-dev/stripe compiled against older convex version
  components.stripe as any,
  {}
);

export const STRIPE_PRICES = {
  proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  proYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
} as const;

/**
 * Create a Stripe Checkout session with promotion codes enabled.
 * Extracted here so the Stripe SDK types don't break inference in action() handlers.
 */
export async function createCheckoutSessionWithPromoCodes(args: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  orgId: string;
}): Promise<{ sessionId: string; url: string | null }> {
  const stripe = new Stripe(stripeClient.apiKey);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: args.customerId,
    line_items: [{ price: args.priceId, quantity: 1 }],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    allow_promotion_codes: true,
    metadata: { orgId: args.orgId },
    subscription_data: { metadata: { orgId: args.orgId } },
  });

  return { sessionId: session.id, url: session.url };
}
