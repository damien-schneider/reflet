import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type EffectiveTier = "free" | "pro";

export async function getEffectiveTier(
  ctx: Pick<QueryCtx, "db" | "runQuery">,
  organizationId: Id<"organizations">
): Promise<EffectiveTier> {
  const organization = await ctx.db.get(organizationId);
  if (!organization?.stripeCustomerId) {
    return "free";
  }

  const subscription = await ctx.runQuery(
    components.stripe.public.getSubscriptionByOrgId,
    { orgId: organizationId }
  );
  const hasActiveSubscription =
    subscription &&
    subscription.stripeCustomerId === organization.stripeCustomerId &&
    (subscription.status === "active" || subscription.status === "trialing");

  return hasActiveSubscription ? "pro" : "free";
}
