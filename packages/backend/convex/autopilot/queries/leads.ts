/**
 * Leads queries — sales pipeline data.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { leadStatus } from "../schema/validators";
import { requireOrgMembership } from "./auth";

export const listLeads = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(leadStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    if (args.status) {
      const { status } = args;
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

    const pipeline: Record<string, number> = {
      discovered: 0,
      contacted: 0,
      replied: 0,
      demo: 0,
      converted: 0,
    };
    let totalActive = 0;
    let pendingDrafts = 0;
    const converted = leads.filter((l) => l.status === "converted").length;

    for (const lead of leads) {
      const status = lead.status;
      if (status in pipeline) {
        pipeline[status] += 1;
      }
      if (
        status !== "converted" &&
        status !== "churned" &&
        status !== "disqualified"
      ) {
        totalActive++;
      }
      if (status === "discovered") {
        pendingDrafts++;
      }
    }

    const conversionRate =
      leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0;

    return {
      totalLeads: leads.length,
      totalActive,
      conversionRate,
      pendingDrafts,
      pipeline,
    };
  },
});
