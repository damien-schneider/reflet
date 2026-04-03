/**
 * Sales Agent — V6 agent for lead discovery, outreach, and pipeline management.
 *
 * Discovers leads from GitHub activity, web mentions, and manual input.
 * Drafts personalized outreach that always requires inbox approval.
 * Tracks leads through a pipeline: discovered → contacted → converted.
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { leadSource, leadStatus } from "../tableFields";

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

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new lead.
 */
export const createLead = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    source: leadSource,
    sourceUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("autopilotLeads"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotLeads", {
      organizationId: args.organizationId,
      name: args.name,
      email: args.email,
      company: args.company,
      source: args.source,
      status: "discovered",
      sourceUrl: args.sourceUrl,
      notes: args.notes,
      outreachCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update lead status and track state transitions.
 */
export const updateLeadStatus = internalMutation({
  args: {
    leadId: v.id("autopilotLeads"),
    status: leadStatus,
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      return null;
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.notes) {
      updates.notes = args.notes;
    }

    if (args.status === "converted") {
      updates.convertedAt = now;
    }

    if (args.status === "contacted") {
      updates.lastContactedAt = now;
      updates.outreachCount = lead.outreachCount + 1;
      // Default follow-up in 3 days
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      updates.nextFollowUpAt = now + THREE_DAYS_MS;
    }

    await ctx.db.patch(args.leadId, updates);

    // Create inbox item for pipeline update
    await ctx.db.insert("autopilotInboxItems", {
      organizationId: lead.organizationId,
      type: "sales_pipeline_update",
      title: `Lead "${lead.name}" moved to ${args.status}`,
      summary: `${lead.name}${lead.company ? ` (${lead.company})` : ""} is now in ${args.status} stage.`,
      status: "auto_approved",
      priority: args.status === "converted" ? "high" : "low",
      sourceAgent: "sales",
      createdAt: now,
    });

    return null;
  },
});

// ============================================
// ACTIONS
// ============================================

/**
 * Run the sales follow-up check.
 * Finds leads due for follow-up and creates outreach draft inbox items.
 */
export const runSalesFollowUp = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Check autonomy mode
    const stopped = await ctx.runQuery(internal.autopilot.autonomy.isStopped, {
      organizationId: args.organizationId,
    });
    if (stopped) {
      return;
    }

    // Check if sales is enabled
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });
    if (!config?.salesEnabled) {
      return;
    }

    const leads = await ctx.runQuery(
      internal.autopilot.agents.sales.getLeadsDueForFollowUp,
      { organizationId: args.organizationId }
    );

    if (leads.length === 0) {
      return;
    }

    const MAX_DAILY_OUTREACH = 10;
    const leadsToProcess = leads.slice(0, MAX_DAILY_OUTREACH);

    for (const lead of leadsToProcess) {
      // Create an outreach draft inbox item for each lead
      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "sales_outreach_draft",
        title: `Follow-up: ${lead.name}`,
        summary: `Follow-up outreach due for ${lead.name}${lead.company ? ` at ${lead.company}` : ""}. Contact: ${lead.email ?? "no email"}. Status: ${lead.status}. Outreach count: ${lead.outreachCount}.`,
        priority: "medium",
        sourceAgent: "sales",
      });

      // Schedule next follow-up (7 days from now)
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      await ctx.runMutation(
        internal.autopilot.agents.sales.updateLeadFollowUp,
        {
          leadId: lead._id,
          nextFollowUpAt: Date.now() + SEVEN_DAYS_MS,
        }
      );
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "sales",
      level: "action",
      message: `Sales follow-up: ${leadsToProcess.length} leads need outreach`,
    });
  },
});

/**
 * Update a lead's next follow-up time.
 */
export const updateLeadFollowUp = internalMutation({
  args: {
    leadId: v.id("autopilotLeads"),
    nextFollowUpAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      nextFollowUpAt: args.nextFollowUpAt,
      updatedAt: Date.now(),
    });
    return null;
  },
});
