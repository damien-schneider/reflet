/**
 * Analytics dashboard queries — metrics, trends, anomalies.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

const requireOrgMembership = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  userId: string
) => {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  return membership;
};

export const listAnalyticsSnapshots = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotAnalyticsSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit ?? 90);
  },
});

export const getLatestAnalyticsSnapshot = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotAnalyticsSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();
  },
});

export const getAnalyticsInsights = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    // Get anomaly alerts from inbox
    const anomalyAlerts = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "analytics_anomaly")
      )
      .order("desc")
      .take(20);

    // Get insight alerts from inbox
    const insightAlerts = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "analytics_insight")
      )
      .order("desc")
      .take(20);

    return { anomalyAlerts, insightAlerts };
  },
});
