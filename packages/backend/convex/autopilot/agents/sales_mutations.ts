/**
 * Sales Agent — Mutations and follow-up workflow.
 *
 * Lead CRUD, status transitions, and follow-up outreach scheduling.
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction, internalMutation } from "../../_generated/server";
import { leadSource, leadStatus } from "../schema/validators";

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

    // Log pipeline update via activity log
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: lead.organizationId,
      agent: "sales",
      level: "info",
      message: `Lead "${lead.name}" moved to ${args.status}`,
    });

    return null;
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

// ============================================
// FOLLOW-UP ACTION
// ============================================

/**
 * Run the sales follow-up check.
 * Finds leads due for follow-up and creates outreach draft inbox items.
 */
export const runSalesFollowUp = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Check autonomy mode
    const stopped = await ctx.runQuery(internal.autopilot.gate.isStopped, {
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
      internal.autopilot.agents.sales_queries.getLeadsDueForFollowUp,
      { organizationId: args.organizationId }
    );

    if (leads.length === 0) {
      return;
    }

    const MAX_DAILY_OUTREACH = 10;
    const leadsToProcess = leads.slice(0, MAX_DAILY_OUTREACH);

    for (const lead of leadsToProcess) {
      // Build contextual outreach summary
      const contextParts = [
        `Follow-up outreach due for ${lead.name}${lead.company ? ` at ${lead.company}` : ""}.`,
        `Contact: ${lead.email ?? "no email"}.`,
        `Status: ${lead.status}. Outreach count: ${lead.outreachCount}.`,
      ];
      if (lead.bio) {
        contextParts.push(`Bio: ${lead.bio}`);
      }
      if (lead.notes) {
        contextParts.push(`Notes: ${lead.notes}`);
      }

      // Log outreach draft for each lead
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "sales",
        level: "action",
        message: `Follow-up: ${lead.name} — ${contextParts.join(" ")}`,
      });

      // Schedule next follow-up (7 days from now)
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      await ctx.runMutation(
        internal.autopilot.agents.sales_mutations.updateLeadFollowUp,
        {
          leadId: lead._id,
          nextFollowUpAt: Date.now() + SEVEN_DAYS_MS,
        }
      );
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "sales",
      level: "action",
      message: `Sales follow-up: ${leadsToProcess.length} leads need outreach`,
    });
  },
});
