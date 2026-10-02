import { ConvexError, type Infer, v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { action, internalQuery } from "../_generated/server";
import { getOrgSubscription, planTierFor } from "../billing/org_subscription";
import {
  cancelSubscriptionNow,
  createProTrialSubscription,
  listOrgSubscriptionsFromStripe,
  retargetTrialEnd,
  STRIPE_PRICES,
  stripeClient,
} from "../billing/stripe";
import { assertSuperAdmin } from "../shared/access";
import { subscriptionTier } from "../shared/validators";
import { ownerOf } from "./super_admin_customers";

const MAX_TRIAL_DAYS = 365;
const ENDED_STATUSES: Record<string, true> = {
  canceled: true,
  incomplete_expired: true,
};

interface BillingTarget {
  name: string;
  ownerEmail: string | undefined;
  stripeCustomerId: string | undefined;
}

export const getBillingTarget = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<BillingTarget | null> => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }
    const owner = await ownerOf(ctx, org);
    return {
      name: org.name,
      ownerEmail: owner?.email,
      stripeCustomerId: org.stripeCustomerId,
    };
  },
});

// Convex hides raw throws from clients, so the admin would only see "Server Error".
const relayingStripeFailure = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw new ConvexError({
      code: "STRIPE_REFUSED",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

const requireBillingTarget = async (
  ctx: ActionCtx,
  organizationId: Id<"organizations">
): Promise<BillingTarget> => {
  const target: BillingTarget | null = await ctx.runQuery(
    internal.organizations.super_admin_billing.getBillingTarget,
    { organizationId }
  );
  if (!target) {
    throw new ConvexError({
      code: "ORG_NOT_FOUND",
      message: "Organization not found.",
    });
  }
  return target;
};

const noSubscription = (): ConvexError<{ code: string; message: string }> =>
  new ConvexError({
    code: "NO_SUBSCRIPTION",
    message: "This organization has no Stripe subscription.",
  });

const ensureStripeCustomer = async (
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  target: BillingTarget
): Promise<string> => {
  if (target.stripeCustomerId) {
    return target.stripeCustomerId;
  }
  const { customerId } = await stripeClient.getOrCreateCustomer(ctx, {
    email: target.ownerEmail,
    name: target.name,
    userId: organizationId,
  });
  await ctx.runMutation(internal.billing.internal.setOrgStripeCustomer, {
    organizationId,
    stripeCustomerId: customerId,
  });
  return customerId;
};

export const grantProTrial = action({
  args: { days: v.number(), organizationId: v.id("organizations") },
  handler: async (
    ctx,
    { days, organizationId }
  ): Promise<{ status: string; subscriptionId: string }> => {
    await assertSuperAdmin(ctx);

    if (!Number.isInteger(days) || days < 1 || days > MAX_TRIAL_DAYS) {
      throw new ConvexError({
        code: "INVALID_DAYS",
        message: `days must be a whole number between 1 and ${MAX_TRIAL_DAYS}`,
      });
    }

    const target = await requireBillingTarget(ctx, organizationId);
    const current = await getOrgSubscription(ctx, organizationId);

    // The subscription.created/updated webhooks write the org tier; never patched here.
    if (current?.status === "trialing") {
      return await relayingStripeFailure(() =>
        retargetTrialEnd({
          subscriptionId: current.stripeSubscriptionId,
          trialDays: days,
        })
      );
    }
    if (current && !ENDED_STATUSES[current.status]) {
      throw new ConvexError({
        code: "ALREADY_SUBSCRIBED",
        message: `Organization has a ${current.status} subscription that still bills — change it in Stripe.`,
      });
    }

    const priceId = STRIPE_PRICES.proMonthly;
    if (!priceId) {
      throw new ConvexError({
        code: "PRICE_NOT_CONFIGURED",
        message: "STRIPE_PRICE_PRO_MONTHLY is not set on this deployment.",
      });
    }

    const customerId = await relayingStripeFailure(() =>
      ensureStripeCustomer(ctx, organizationId, target)
    );
    return await relayingStripeFailure(() =>
      createProTrialSubscription({
        customerId,
        orgId: organizationId,
        priceId,
        trialDays: days,
      })
    );
  },
  returns: v.object({ status: v.string(), subscriptionId: v.string() }),
});

// Webhooks stay the normal path; this repairs an org whose webhook was missed.
export const syncFromStripe = action({
  args: { organizationId: v.id("organizations") },
  handler: async (
    ctx,
    { organizationId }
  ): Promise<{ status: string; tier: Infer<typeof subscriptionTier> }> => {
    await assertSuperAdmin(ctx);

    const { stripeCustomerId } = await requireBillingTarget(
      ctx,
      organizationId
    );
    if (!stripeCustomerId) {
      throw noSubscription();
    }

    const subscriptions = await relayingStripeFailure(() =>
      listOrgSubscriptionsFromStripe({
        customerId: stripeCustomerId,
        orgId: organizationId,
      })
    );
    if (subscriptions.length === 0) {
      throw noSubscription();
    }

    for (const subscription of subscriptions) {
      await ctx.runMutation(
        components.stripe.private.handleSubscriptionUpdated,
        subscription
      );
    }
    await ctx.runMutation(internal.billing.internal.syncOrgSubscription, {
      organizationId,
    });

    const synced = await getOrgSubscription(ctx, organizationId);
    return { status: synced?.status ?? "none", tier: planTierFor(synced) };
  },
  returns: v.object({ status: v.string(), tier: subscriptionTier }),
});

export const cancelSubscription = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }): Promise<{ status: string }> => {
    await assertSuperAdmin(ctx);

    const subscription = await getOrgSubscription(ctx, organizationId);
    if (!subscription || ENDED_STATUSES[subscription.status]) {
      throw noSubscription();
    }

    return await relayingStripeFailure(() =>
      cancelSubscriptionNow(subscription.stripeSubscriptionId)
    );
  },
  returns: v.object({ status: v.string() }),
});
