import { StripeSubscriptions } from "@convex-dev/stripe";
import Stripe from "stripe";
import { components } from "../_generated/api";
import { cancellationFromStripeSubscription } from "./cancellations";

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
    allow_promotion_codes: true,
    cancel_url: args.cancelUrl,
    customer: args.customerId,
    line_items: [{ price: args.priceId, quantity: 1 }],
    metadata: { orgId: args.orgId },
    mode: "subscription",
    subscription_data: { metadata: { orgId: args.orgId } },
    success_url: args.successUrl,
  });

  return { sessionId: session.id, url: session.url };
}

const SECONDS_PER_DAY = 24 * 60 * 60;

interface SubscriptionSummary {
  status: string;
  subscriptionId: string;
}

export interface MirroredSubscription {
  cancelAt?: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number;
  metadata: Record<string, string>;
  priceId?: string;
  quantity: number;
  status: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

const trialEndFromNow = (trialDays: number): number =>
  Math.floor(Date.now() / 1000) + trialDays * SECONDS_PER_DAY;

/** cancel_at pins the end even when the customer still has a saved card from a past subscription. */
export async function createProTrialSubscription(args: {
  customerId: string;
  orgId: string;
  priceId: string;
  trialDays: number;
}): Promise<SubscriptionSummary> {
  const stripe = new Stripe(stripeClient.apiKey);
  const trialEnd = trialEndFromNow(args.trialDays);
  const subscription = await stripe.subscriptions.create({
    cancel_at: trialEnd,
    customer: args.customerId,
    items: [{ price: args.priceId }],
    metadata: { orgId: args.orgId },
    trial_end: trialEnd,
  });
  return { status: subscription.status, subscriptionId: subscription.id };
}

export async function retargetTrialEnd(args: {
  subscriptionId: string;
  trialDays: number;
}): Promise<SubscriptionSummary> {
  const stripe = new Stripe(stripeClient.apiKey);
  const trialEnd = trialEndFromNow(args.trialDays);
  const subscription = await stripe.subscriptions.update(args.subscriptionId, {
    cancel_at: trialEnd,
    proration_behavior: "none",
    trial_end: trialEnd,
  });
  return { status: subscription.status, subscriptionId: subscription.id };
}

export interface StripeSubscriptionSnapshot {
  cancellation: ReturnType<typeof cancellationFromStripeSubscription>;
  mirrored: MirroredSubscription;
}

/** Every Stripe subscription of the customer tagged with this org: the component's webhook mirror plus its cancellation, if any. */
export async function listOrgSubscriptionsFromStripe(args: {
  customerId: string;
  orgId: string;
}): Promise<StripeSubscriptionSnapshot[]> {
  const stripe = new Stripe(stripeClient.apiKey);
  const subscriptions = await stripe.subscriptions
    .list({ customer: args.customerId, status: "all" })
    .autoPagingToArray({ limit: 100 });
  return subscriptions
    .filter((subscription) => subscription.metadata.orgId === args.orgId)
    .map((subscription) => {
      const item = subscription.items.data[0];
      return {
        cancellation: cancellationFromStripeSubscription(subscription),
        mirrored: {
          cancelAt: subscription.cancel_at ?? undefined,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: item?.current_period_end ?? 0,
          metadata: subscription.metadata,
          priceId: item?.price.id,
          quantity: item?.quantity ?? 1,
          status: subscription.status,
          stripeCustomerId: args.customerId,
          stripeSubscriptionId: subscription.id,
        },
      };
    });
}

export async function cancelSubscriptionNow(
  subscriptionId: string
): Promise<{ status: string }> {
  const stripe = new Stripe(stripeClient.apiKey);
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return { status: subscription.status };
}

const FULL_DISCOUNT_PERCENT = 100;

/** Also drops a pending cancellation: the subscription renews, free, then bills again. */
export async function grantFreeMonths(args: {
  months: number;
  subscriptionId: string;
}): Promise<{ cancelAtPeriodEnd: boolean; status: string }> {
  const stripe = new Stripe(stripeClient.apiKey);
  const coupon = await stripe.coupons.create(
    args.months === 1
      ? {
          duration: "once",
          name: "1 free month",
          percent_off: FULL_DISCOUNT_PERCENT,
        }
      : {
          duration: "repeating",
          duration_in_months: args.months,
          name: `${args.months} free months`,
          percent_off: FULL_DISCOUNT_PERCENT,
        }
  );
  // ponytail: replaces any promo code already on the subscription; re-add it in Stripe if one mattered
  const subscription = await stripe.subscriptions.update(args.subscriptionId, {
    cancel_at_period_end: false,
    discounts: [{ coupon: coupon.id }],
  });
  return {
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    status: subscription.status,
  };
}
