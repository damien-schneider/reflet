/**
 * Sales mutations — public mutations for lead management.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { requireOrgAdmin } from "./mutations/auth";

/**
 * Trigger lead discovery — schedules the sales prospecting action.
 */
export const triggerLeadDiscovery = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.agents.sales.runSalesProspecting,
      { organizationId: args.organizationId }
    );

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      agent: "sales",
      level: "action",
      action: "manual_lead_discovery",
      message: "Manual lead discovery triggered by user",
      createdAt: Date.now(),
    });

    return null;
  },
});
