import type { Infer } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { subscriptionTier } from "../shared/validators";

export interface OrgSubscription {
  cancelAt?: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number;
  priceId: string;
  status: string;
  stripeSubscriptionId: string;
}

interface SubscriptionReaderCtx {
  runQuery: (
    query: typeof components.stripe.public.listSubscriptionsByOrgId,
    args: { orgId: string }
  ) => Promise<OrgSubscription[]>;
}

type PlanTier = Infer<typeof subscriptionTier>;

const grantsPro = (subscription: OrgSubscription): boolean =>
  subscription.status === "active" || subscription.status === "trialing";

export const planTierFor = (subscription: OrgSubscription | null): PlanTier =>
  subscription && grantsPro(subscription) ? "pro" : "free";

export const getOrgSubscription = async (
  ctx: SubscriptionReaderCtx,
  organizationId: Id<"organizations">
): Promise<OrgSubscription | null> => {
  const subscriptions = await ctx.runQuery(
    components.stripe.public.listSubscriptionsByOrgId,
    { orgId: organizationId }
  );
  const latestPeriodFirst = [...subscriptions].sort(
    (a, b) => b.currentPeriodEnd - a.currentPeriodEnd
  );
  return latestPeriodFirst.find(grantsPro) ?? latestPeriodFirst[0] ?? null;
};

export const getOrgTier = async (
  ctx: SubscriptionReaderCtx,
  organizationId: Id<"organizations">
): Promise<PlanTier> =>
  planTierFor(await getOrgSubscription(ctx, organizationId));
