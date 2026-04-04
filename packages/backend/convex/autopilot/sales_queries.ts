/**
 * Sales pipeline queries — leads, conversion metrics, outreach.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { leadStatus } from "./schema/validators";

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

export const listLeads = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(leadStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 100;

    if (args.status) {
      const status = args.status;
      return ctx.db
        .query("autopilotLeads")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("autopilotLeads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

export const getLead = query({
  args: { leadId: v.id("autopilotLeads") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      return null;
    }

    await requireOrgMembership(ctx, lead.organizationId, user._id);
    return lead;
  },
});

export const getSalesStats = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const leads = await ctx.db
      .query("autopilotLeads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const pipeline = {
      discovered: leads.filter((l) => l.status === "discovered").length,
      contacted: leads.filter((l) => l.status === "contacted").length,
      replied: leads.filter((l) => l.status === "replied").length,
      demo: leads.filter((l) => l.status === "demo").length,
      converted: leads.filter((l) => l.status === "converted").length,
      churned: leads.filter((l) => l.status === "churned").length,
      disqualified: leads.filter((l) => l.status === "disqualified").length,
    };

    const totalActive =
      pipeline.discovered +
      pipeline.contacted +
      pipeline.replied +
      pipeline.demo;
    const conversionRate =
      leads.length === 0
        ? 0
        : Math.round((pipeline.converted / leads.length) * 100);

    // Get outreach drafts pending approval
    const outreachDrafts = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "sales_outreach_draft")
      )
      .collect();
    const pendingDrafts = outreachDrafts.filter(
      (d) => d.status === "pending"
    ).length;

    return {
      totalLeads: leads.length,
      totalActive,
      pipeline,
      conversionRate,
      pendingDrafts,
    };
  },
});
