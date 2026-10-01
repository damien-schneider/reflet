import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { subscriptionStatus } from "../shared/validators";
import { getOrgSubscription, planTierFor } from "./org_subscription";

export const getOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => await ctx.db.get(args.organizationId),
});

export const setOrgStripeCustomer = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

export const syncOrgSubscription = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const organizationId = ctx.db.normalizeId(
      "organizations",
      args.organizationId
    );
    const org = organizationId ? await ctx.db.get(organizationId) : null;
    if (!org) {
      return null;
    }
    const subscription = await getOrgSubscription(ctx, org._id);
    const knownStatus = subscriptionStatus.members.find(
      (member) => member.value === subscription?.status
    );
    await ctx.db.patch(org._id, {
      stripeSubscriptionId: subscription?.stripeSubscriptionId,
      subscriptionStatus: knownStatus?.value ?? "none",
      subscriptionTier: planTierFor(subscription),
    });
    return null;
  },
  returns: v.null(),
});
