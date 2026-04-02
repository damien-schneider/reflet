/**
 * Autopilot billing gate — ensures autopilot is only available to paying orgs.
 *
 * Provides internal helpers that other autopilot functions call
 * before executing premium-only operations.
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalQuery } from "../_generated/server";

/**
 * Check whether the org has an active subscription that includes autopilot.
 *
 * Returns the tier. Autopilot requires "pro" tier.
 */
export const checkAccess = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    allowed: v.boolean(),
    tier: v.union(v.literal("free"), v.literal("pro")),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: args.organizationId }
    );
    const hasActiveSubscription =
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing");
    const tier = hasActiveSubscription ? ("pro" as const) : ("free" as const);

    if (tier === "pro") {
      return { allowed: true, tier };
    }

    return {
      allowed: false,
      tier,
      reason: "Autopilot requires a Pro subscription.",
    };
  },
});

/**
 * Quick boolean check — can this org use autopilot?
 */
export const isAutopilotAllowed = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: args.organizationId }
    );
    if (
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing")
    ) {
      return true;
    }
    return false;
  },
});
