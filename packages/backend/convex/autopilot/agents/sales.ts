/**
 * Sales Agent — V6 agent for lead discovery, outreach, and pipeline management.
 *
 * Discovers leads from GitHub activity, web mentions, and manual input.
 * Drafts personalized outreach that always requires inbox approval.
 * Tracks leads through a pipeline: discovered → contacted → converted.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { leadSource, leadStatus } from "../schema/validators";
import { MODELS } from "./models";
import { buildAgentPrompt, SALES_SYSTEM_PROMPT } from "./prompts";
import { generateObjectWithFallback } from "./shared";

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

    // Log pipeline update via activity log
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: lead.organizationId,
      agent: "sales",
      level: "info",
      message: `Lead "${lead.name}" moved to ${args.status}`,
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
      internal.autopilot.agents.sales.getLeadsDueForFollowUp,
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
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "sales",
        level: "action",
        message: `Follow-up: ${lead.name} — ${contextParts.join(" ")}`,
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

// ============================================
// PROSPECTING
// ============================================

const PROSPECTING_MODELS = [MODELS.SEARCH_FREE, MODELS.SEARCH_PAID] as const;

const prospectingSchema = z.object({
  leads: z.array(
    z.object({
      name: z.string().describe("Person or company name"),
      company: z.string().describe("Company name"),
      source: z
        .enum([
          "github_star",
          "github_fork",
          "product_hunt",
          "hackernews",
          "reddit",
          "web_search",
          "referral",
          "manual",
        ])
        .describe("Where the lead was found"),
      sourceUrl: z.string().describe("URL where the lead was discovered"),
      notes: z
        .string()
        .describe("Why this is a good lead, context from the thread"),
      priority: z
        .enum(["high", "medium", "low"])
        .describe("Lead quality/priority"),
    })
  ),
  patterns: z.array(
    z.object({
      pattern: z.string().describe("Observed prospect pattern"),
      description: z.string().describe("Details about this pattern"),
      actionable: z
        .boolean()
        .describe("Whether this is immediately actionable"),
    })
  ),
  summary: z.string().describe("Executive summary of prospecting findings"),
});

/**
 * Run sales prospecting — reads market notes, discovers leads, creates prospect notes.
 */
export const runSalesProspecting = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const stopped = await ctx.runQuery(internal.autopilot.gate.isStopped, {
        organizationId: args.organizationId,
      });
      if (stopped) {
        return null;
      }

      const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
        organizationId: args.organizationId,
      });
      if (!config?.salesEnabled) {
        return null;
      }

      const marketNotes = await ctx.runQuery(
        internal.autopilot.documents.getDocumentsByOrg,
        { organizationId: args.organizationId, type: "note" }
      );

      // Also read market research documents for richer context
      const marketDocs = await ctx.runQuery(
        internal.autopilot.documents.getDocumentsByOrg,
        { organizationId: args.organizationId, type: "market_research" }
      );

      const agentKnowledge = await ctx.runQuery(
        internal.autopilot.agent_context.loadAgentContext,
        { organizationId: args.organizationId, agent: "sales" }
      );

      const existingLeads = await ctx.runQuery(
        internal.autopilot.agents.sales.getLeads,
        { organizationId: args.organizationId }
      );

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "sales",
        level: "action",
        message: "Starting sales prospecting",
        details: `Market notes: ${marketNotes.length} | Market docs: ${marketDocs.length} | Existing leads: ${existingLeads.length}`,
      });

      const marketNotesContext = marketNotes
        .map(
          (n: { title: string; content: string }) =>
            `- ${n.title}: ${n.content.slice(0, 200)}`
        )
        .join("\n");

      const marketDocsContext = marketDocs
        .map(
          (d: { title: string; content: string }) =>
            `- ${d.title}: ${d.content.slice(0, 300)}`
        )
        .join("\n");

      const existingLeadNames = existingLeads
        .map(
          (l: { name: string; company?: string; status: string }) =>
            `- ${l.name}${l.company ? ` (${l.company})` : ""} — ${l.status}`
        )
        .join("\n");

      const systemPrompt = buildAgentPrompt(
        SALES_SYSTEM_PROMPT,
        "",
        "",
        agentKnowledge
      );

      const prospectOutput = await generateObjectWithFallback({
        models: PROSPECTING_MODELS,
        schema: prospectingSchema,
        systemPrompt,
        prompt: `Analyze market intelligence and discover potential leads.

MARKET NOTES FROM GROWTH AGENT:
${marketNotesContext || "(none — Growth agent hasn't produced market research yet)"}

MARKET RESEARCH DOCUMENTS:
${marketDocsContext || "(none)"}

EXISTING LEADS (avoid duplicates):
${existingLeadNames || "(none)"}

Based on the market notes and your knowledge of the product's ICP:
1. Identify potential leads from community discussions
2. Look for high-intent signals (people asking for solutions, comparing tools, etc.)
3. Note patterns in who is interested and why
4. Only return leads that are genuinely new (not already in the existing leads list)

Focus on quality over quantity — 3-5 high-quality leads are better than 20 low-quality ones.`,
      });

      let createdLeadCount = 0;
      for (const lead of prospectOutput.leads) {
        const isDuplicate = existingLeads.some(
          (existing: { name: string; company?: string }) =>
            existing.name.toLowerCase() === lead.name.toLowerCase() ||
            (existing.company &&
              lead.company &&
              existing.company.toLowerCase() === lead.company.toLowerCase())
        );

        if (isDuplicate) {
          continue;
        }

        await ctx.runMutation(internal.autopilot.agents.sales.createLead, {
          organizationId: args.organizationId,
          name: lead.name,
          company: lead.company,
          source: lead.source,
          sourceUrl: lead.sourceUrl,
          notes: lead.notes,
        });
        createdLeadCount++;
      }

      // Write prospect documents about patterns for PM/CEO
      for (const pattern of prospectOutput.patterns) {
        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: "note",
          title: pattern.pattern,
          content: pattern.description,
          sourceAgent: "sales",
          needsReview: pattern.actionable,
          reviewType: "prospect_pattern",
          tags: ["prospect", pattern.actionable ? "actionable" : "observation"],
        });
      }

      // Create a prospect brief document summarizing the prospecting round
      if (
        prospectOutput.leads.length > 0 ||
        prospectOutput.patterns.length > 0
      ) {
        const briefContent = [
          "## Sales Prospecting Summary",
          "",
          `**New Leads Found:** ${createdLeadCount}`,
          `**Patterns Identified:** ${prospectOutput.patterns.length}`,
          "",
          prospectOutput.summary,
          "",
          ...prospectOutput.patterns.map(
            (p) => `### ${p.pattern}\n${p.description}\n`
          ),
        ].join("\n");

        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: "report",
          title: `Prospecting: ${createdLeadCount} leads, ${prospectOutput.patterns.length} patterns`,
          content: briefContent,
          tags: ["sales", "prospecting"],
          sourceAgent: "sales",
        });
      }

      // Complete any in_progress tasks assigned to sales
      await ctx.runMutation(internal.autopilot.tasks.completeAgentTasks, {
        organizationId: args.organizationId,
        agent: "sales",
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "sales",
        level: "success",
        message: `Sales prospecting complete: ${createdLeadCount} new leads, ${prospectOutput.patterns.length} patterns noted`,
        details: prospectOutput.summary,
      });

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "sales",
        level: "error",
        message: `Sales prospecting failed: ${errorMessage}`,
      });

      return null;
    }
  },
});
