/**
 * Sales Agent — Queries for lead data and pipeline summary.
 */

import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { leadSource, leadStatus } from "../schema/validators";

// ============================================
// QUERIES
// ============================================

/**
 * Get all leads for an organization, optionally filtered by status.
 */
export const getLeads = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(leadStatus),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotLeads"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      name: v.string(),
      email: v.optional(v.string()),
      company: v.optional(v.string()),
      source: leadSource,
      status: leadStatus,
      sourceUrl: v.optional(v.string()),
      notes: v.optional(v.string()),
      lastContactedAt: v.optional(v.number()),
      nextFollowUpAt: v.optional(v.number()),
      convertedAt: v.optional(v.number()),
      outreachCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    if (args.status) {
      const { status } = args;
      return await ctx.db
        .query("autopilotLeads")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();
    }
    return await ctx.db
      .query("autopilotLeads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

/**
 * Get leads due for follow-up.
 */
export const getLeadsDueForFollowUp = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotLeads"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      name: v.string(),
      email: v.optional(v.string()),
      company: v.optional(v.string()),
      source: leadSource,
      status: leadStatus,
      sourceUrl: v.optional(v.string()),
      notes: v.optional(v.string()),
      lastContactedAt: v.optional(v.number()),
      nextFollowUpAt: v.optional(v.number()),
      convertedAt: v.optional(v.number()),
      outreachCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();
    const leads = await ctx.db
      .query("autopilotLeads")
      .withIndex("by_org_follow_up", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return leads.filter(
      (lead) =>
        lead.nextFollowUpAt !== undefined &&
        lead.nextFollowUpAt <= now &&
        lead.status !== "converted" &&
        lead.status !== "churned" &&
        lead.status !== "disqualified"
    );
  },
});

/**
 * Get pipeline summary for the organization.
 */
export const getPipelineSummary = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    discovered: v.number(),
    contacted: v.number(),
    replied: v.number(),
    demo: v.number(),
    converted: v.number(),
    churned: v.number(),
    disqualified: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("autopilotLeads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const summary = {
      discovered: 0,
      contacted: 0,
      replied: 0,
      demo: 0,
      converted: 0,
      churned: 0,
      disqualified: 0,
      total: leads.length,
    };

    for (const lead of leads) {
      summary[lead.status] += 1;
    }

    return summary;
  },
});
