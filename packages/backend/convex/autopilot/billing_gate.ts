/**
 * Autopilot billing gate — ensures autopilot is only available to paying orgs.
 *
 * Provides internal helpers that other autopilot functions call
 * before executing premium-only operations.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { getEffectiveTier } from "../billing/effective_tier";

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
    const tier = await getEffectiveTier(ctx, args.organizationId);

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
    const tier = await getEffectiveTier(ctx, args.organizationId);
    return tier === "pro";
  },
});
