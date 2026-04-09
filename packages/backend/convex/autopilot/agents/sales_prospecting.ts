/** Sales Agent — Prospecting workflow. Discovers leads from web search and structures them into the pipeline. */
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { QUALITY_MODELS, WEB_SEARCH_MODELS } from "./models";
import { buildAgentPrompt, SALES_SYSTEM_PROMPT } from "./prompts";
import { createValidatedLeads, runExaSalesDiscovery } from "./sales_discovery";
import { getExaCostUsd, isExaAvailable } from "./shared_exa";
import {
  generateObjectWithFallback,
  getUsageTracker,
  resetUsageTracker,
} from "./shared_generation";
import { generateTextWithWebSearch } from "./shared_web";

const PROSPECTING_MODELS = QUALITY_MODELS;

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

// ============================================
// LEAD CREATION
// ============================================

/**
 * Phase 1: Discovery — web search for lead signals.
 * Schedules Phase 2 with the raw results to stay within the 600s action limit.
 */
export const runSalesProspecting = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Guard check: ensure budget/rate limits allow execution
      const guardResult = await ctx.runQuery(
        internal.autopilot.guards.checkGuards,
        { organizationId: args.organizationId, agent: "sales" }
      );
      if (!guardResult.allowed) {
        return null;
      }

      resetUsageTracker();

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

      const existingLeads = await ctx.runQuery(
        internal.autopilot.agents.sales_queries.getLeads,
        { organizationId: args.organizationId }
      );

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "sales",
        level: "action",
        message: "Starting sales prospecting (phase 1: discovery)",
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

      // Step 1: Discovery — Exa (preferred) or web search (fallback)
      let searchResults: string;
      let citations: Array<{ url: string; title: string; content: string }>;

      if (isExaAvailable()) {
        const exaDiscovery = await runExaSalesDiscovery(
          marketNotesContext,
          marketDocsContext
        );
        searchResults = exaDiscovery.searchResults;
        citations = exaDiscovery.citations;

        const exaCost = getExaCostUsd();
        if (exaCost > 0) {
          await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
            organizationId: args.organizationId,
            agent: "sales",
            level: "info",
            message: `Exa sales discovery: ${citations.length} results (cost: $${exaCost.toFixed(4)})`,
          });
        }
      } else {
        const webResult = await generateTextWithWebSearch({
          models: WEB_SEARCH_MODELS,
          systemPrompt:
            "You are a sales intelligence analyst. Search for high-intent signals — people looking for solutions, comparing tools, expressing frustration with competitors.",
          prompt: `Search for potential leads and high-intent signals related to our product.

CONTEXT FROM GROWTH AGENT:
${marketNotesContext || "(none)"}
${marketDocsContext || "(none)"}

Look for:
1. GitHub users starring/forking similar tools
2. Community discussions where people need solutions we provide
3. Product Hunt launches in our space
4. People comparing competitors or asking for alternatives

Return detailed findings about each potential lead.`,
          searchConfig: {
            max_results: 10,
            allowed_domains: [
              "github.com",
              "reddit.com",
              "news.ycombinator.com",
              "producthunt.com",
              "linkedin.com",
              "x.com",
            ],
          },
        });
        searchResults = webResult.text;
        citations = webResult.citations;
      }

      // Build existing leads context for Phase 2
      const existingLeadNames = existingLeads
        .map(
          (l: { name: string; company?: string; status: string }) =>
            `- ${l.name}${l.company ? ` (${l.company})` : ""} — ${l.status}`
        )
        .join("\n");

      // Schedule Phase 2 with discovery results
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.sales_prospecting
          .processSalesProspectingResults,
        {
          organizationId: args.organizationId,
          searchResults,
          serializedCitations: JSON.stringify(citations),
          existingLeadNames,
          serializedExistingLeads: JSON.stringify(
            existingLeads.map((l: { name: string; company?: string }) => ({
              name: l.name,
              company: l.company,
            }))
          ),
        }
      );

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "sales",
        level: "error",
        message: `Sales prospecting failed (discovery phase): ${errorMessage}`,
      });

      return null;
    }
  },
});

/**
 * Phase 2: Process discovery results — structure leads with LLM,
 * save leads/patterns/brief.
 */
export const processSalesProspectingResults = internalAction({
  args: {
    organizationId: v.id("organizations"),
    searchResults: v.string(),
    serializedCitations: v.string(),
    existingLeadNames: v.string(),
    serializedExistingLeads: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      resetUsageTracker();

      const agentKnowledge = await ctx.runQuery(
        internal.autopilot.agent_context.loadAgentContext,
        { organizationId: args.organizationId, agent: "sales" }
      );

      const systemPrompt = buildAgentPrompt(
        SALES_SYSTEM_PROMPT,
        "",
        "",
        agentKnowledge
      );

      const citations: Array<{
        url: string;
        title: string;
        content: string;
      }> = JSON.parse(args.serializedCitations);

      const existingLeads: Array<{ name: string; company?: string }> =
        JSON.parse(args.serializedExistingLeads);

      const citationsContext = citations
        .map((c) => `- [${c.title}](${c.url}): ${c.content}`)
        .join("\n");

      // Structure into typed leads (only using real citation URLs)
      const prospectOutput = await generateObjectWithFallback({
        models: PROSPECTING_MODELS,
        schema: prospectingSchema,
        systemPrompt,
        prompt: `Structure these web search results into potential leads and patterns.

SEARCH RESULTS:
${args.searchResults}

VERIFIED SOURCES (only use URLs from this list for sourceUrl):
${citationsContext || "(no citations)"}

EXISTING LEADS (avoid duplicates):
${args.existingLeadNames || "(none)"}

Rules:
- Only use sourceUrl values from the VERIFIED SOURCES list above
- Only return leads that are genuinely new (not in existing leads)
- Focus on quality over quantity — 3-5 high-quality leads beats 20 low-quality
- Note patterns in who is interested and why`,
      });

      const createdLeadCount = await createValidatedLeads(
        ctx,
        args.organizationId,
        prospectOutput.leads,
        existingLeads
      );

      // Write prospect documents about patterns for PM/CEO
      for (const pattern of prospectOutput.patterns) {
        // Dedup check — skip if similar note exists
        const existingNote = await ctx.runQuery(
          internal.autopilot.dedup.findSimilarGrowthItem,
          { organizationId: args.organizationId, title: pattern.pattern }
        );
        if (existingNote) {
          continue;
        }
        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: "note",
          title: pattern.pattern,
          content: pattern.description,
          sourceAgent: "sales",
          needsReview: false,
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
          type: "prospect_brief",
          title: `Prospecting: ${createdLeadCount} leads, ${prospectOutput.patterns.length} patterns`,
          content: briefContent,
          tags: ["sales", "prospecting"],
          sourceAgent: "sales",
        });
      }

      // Complete any in_progress tasks assigned to sales
      await ctx.runMutation(
        internal.autopilot.task_mutations.completeAgentTasks,
        {
          organizationId: args.organizationId,
          agent: "sales",
        }
      );

      const usage = getUsageTracker();
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "sales",
        level: "success",
        message: `Sales prospecting complete: ${createdLeadCount} new leads, ${prospectOutput.patterns.length} patterns noted`,
        details: `${prospectOutput.summary} | LLM: ${usage.calls} calls, ~$${usage.estimatedCostUsd.toFixed(4)}`,
      });

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "sales",
        level: "error",
        message: `Sales prospecting failed (processing phase): ${errorMessage}`,
      });

      return null;
    }
  },
});
