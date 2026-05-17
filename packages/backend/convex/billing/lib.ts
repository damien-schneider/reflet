/**
 * Billing helpers shared across queries, actions, and crons.
 *
 * A subscription is considered "active" for entitlement purposes if Stripe
 * reports it as `active` or `trialing`. Centralising this avoids drift
 * (e.g. forgetting `trialing` at a call site) when Stripe adds states.
 */

type SubscriptionLike = { status?: string | null } | null | undefined;

export function hasActiveSubscription(subscription: SubscriptionLike): boolean {
  if (!subscription) {
    return false;
  }
  const { status } = subscription;
  return status === "active" || status === "trialing";
}
