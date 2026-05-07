/**
 * Growth market research — discovers market intelligence, competitor moves,
 * and community discussions via web search.
 */

import { v } from "convex/values";
import type { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { internalAction } from "../../../_generated/server";
import { WEB_SEARCH_MODELS } from "../models";
import { buildAgentPrompt, GROWTH_SYSTEM_PROMPT } from "../prompts";
import {
  generateObjectWithFallback,
  getUsageTracker,
  resetUsageTracker,
} from "../shared_generation";
import { generateTextWithWebSearch } from "../shared_web";
import { discoverThreads, GROWTH_CONTENT_MODELS } from "./discovery";
import { runGapAssessment } from "./gap_assessment";
import {
  loadProductContext,
  MISSING_PRODUCT_DEF_MESSAGE,
} from "./product_context";
import {
  marketResearchSchema,
  processCompetitorMoves,
  saveResearchFindings,
} from "./research_helpers";

type GrowthCtx = Pick<ActionCtx, "runMutation">;

const markGrowthTaskStatus = async (
  ctx: GrowthCtx,
  taskId: Id<"autopilotWorkItems"> | undefined,
  status: "cancelled" | "done" | "todo"
) => {
  if (!taskId) {
    return;
  }
  if (status === "done") {
    await ctx.runMutation(internal.autopilot.task_mutations.completeAgentTask, {
      taskId,
      agent: "growth",
    });
    return;
  }
  await ctx.runMutation(internal.autopilot.task_mutations.updateTaskStatus, {
    taskId,
    status,
  });
};

// ============================================
// ACTIONS
// ============================================

/**
 * Phase 1: Discovery — web search for community discussions and market intel.
 * Schedules Phase 2 with the raw results to stay within the 600s action limit.
 */
export const runGrowthMarketResearch = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.optional(v.id("autopilotWorkItems")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const orgId = args.organizationId;

    try {
      // Guard check: ensure budget/rate limits allow execution
      const guardResult = await ctx.runQuery(
        internal.autopilot.guards.checkGuards,
        { organizationId: orgId, agent: "growth" }
      );
      if (!guardResult.allowed) {
        await markGrowthTaskStatus(ctx, args.taskId, "todo");
        return null;
      }

      resetUsageTracker();
      const product = await loadProductContext(ctx, orgId);
      if (!product) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "growth",
          level: "warning",
          message: MISSING_PRODUCT_DEF_MESSAGE,
        });
        await markGrowthTaskStatus(ctx, args.taskId, "cancelled");
        return null;
      }

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "action",
        message: "Starting market research scan (phase 1: discovery)",
      });

      const followUpNotes = await ctx.runQuery(
        internal.autopilot.documents.getDocumentsByTags,
        { organizationId: orgId, tags: ["growth-followup"] }
      );
      const followUpContext = followUpNotes
        .filter((d: Doc<"autopilotDocuments">) => d.status === "draft")
        .map((d: Doc<"autopilotDocuments">) => d.content)
        .join("\n");

      // Load competitors to feed into discovery pipeline
      const competitors = await ctx.runQuery(
        internal.autopilot.competitors.getCompetitorsByOrg,
        { organizationId: orgId }
      );
      const competitorNames = competitors.map(
        (c: Doc<"autopilotCompetitors">) => c.name
      );

      // 4-stage discovery pipeline: query → search → enrich → score
      const discoveryResult = await discoverThreads(
        product.productName,
        product.productDescription,
        competitorNames
      );

      const systemPrompt = buildAgentPrompt(
        GROWTH_SYSTEM_PROMPT,
        "",
        "",
        product.agentKnowledge
      );

      // Build enriched threads context for deep research
      const threadsContext = discoveryResult.threads
        .map(
          (t) =>
            `- [${t.platform}] ${t.title} (${t.url})\n  Community: ${t.community} | Relevance: ${t.relevanceScore}/100\n  ${t.originalPostContent.slice(0, 200)}`
        )
        .join("\n");

      const { text: deepResearchText, citations: deepCitations } =
        await generateTextWithWebSearch({
          models: WEB_SEARCH_MODELS,
          systemPrompt,
          prompt: `Analyze these community discussions and find additional market intelligence.

PRODUCT IDENTITY:
Name: ${product.productName}
Summary: ${product.productSummary}

FULL PRODUCT DEFINITION:
${product.productDescription}

DISCOVERED THREADS:
${threadsContext || "(none found)"}

${followUpContext ? `PREVIOUS GAPS TO INVESTIGATE:\n${followUpContext}\n` : ""}

Search for additional context about:
1. Market trends relevant to this product's specific domain
2. Competitor product moves — only products/companies that solve the SAME user problem
3. Opportunities for growth or positioning
4. Community pain points this product can address

CRITICAL: Focus on the PROBLEM DOMAIN the product addresses (see product definition above), NOT on development tools, frameworks, or infrastructure the product is built with.
Provide detailed findings with sources.`,
          searchConfig: { max_results: 10 },
        });

      // Schedule Phase 2 with discovery results
      const followUpNoteIds = followUpNotes
        .filter((d: Doc<"autopilotDocuments">) => d.status === "draft")
        .map((d: Doc<"autopilotDocuments">) => d._id);

      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.growth.market_research
          .processGrowthResearchResults,
        {
          organizationId: orgId,
          deepResearchText,
          serializedCitations: JSON.stringify(deepCitations),
          serializedThreadUrls: JSON.stringify(
            discoveryResult.threads.map((t) => t.url)
          ),
          followUpNoteIds,
          taskId: args.taskId,
        }
      );

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "error",
        message: `Market research failed (discovery phase): ${errorMessage}`,
      });
      await markGrowthTaskStatus(ctx, args.taskId, "cancelled");
      return null;
    }
  },
});

/**
 * Phase 2a: Structure findings via LLM and save research documents.
 * Schedules Phase 2b for competitor processing and gap assessment.
 */
export const processGrowthResearchResults = internalAction({
  args: {
    organizationId: v.id("organizations"),
    deepResearchText: v.string(),
    serializedCitations: v.string(),
    serializedThreadUrls: v.string(),
    followUpNoteIds: v.array(v.id("autopilotDocuments")),
    taskId: v.optional(v.id("autopilotWorkItems")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const orgId = args.organizationId;

    try {
      resetUsageTracker();
      const product = await loadProductContext(ctx, orgId);
      if (!product) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "growth",
          level: "warning",
          message: MISSING_PRODUCT_DEF_MESSAGE,
        });
        await markGrowthTaskStatus(ctx, args.taskId, "cancelled");
        return null;
      }

      const deepCitations: Array<{
        url: string;
        title: string;
        content: string;
      }> = JSON.parse(args.serializedCitations);
      const threadUrls: string[] = JSON.parse(args.serializedThreadUrls);

      const systemPrompt = buildAgentPrompt(
        GROWTH_SYSTEM_PROMPT,
        "",
        "",
        product.agentKnowledge
      );

      const citationsContext = deepCitations
        .map((c) => `- [${c.title}](${c.url}): ${c.content}`)
        .join("\n");

      const researchOutput = await generateObjectWithFallback({
        models: GROWTH_CONTENT_MODELS,
        schema: marketResearchSchema,
        systemPrompt,
        prompt: `Structure this market research into findings and competitor moves.

PRODUCT IDENTITY (use this to judge what is and isn't a competitor):
Name: ${product.productName}
Summary: ${product.productSummary}

FULL PRODUCT DEFINITION:
${product.productDescription}

RAW RESEARCH:
${args.deepResearchText}

VERIFIED SOURCES (only use URLs from this list):
${citationsContext || "(no citations)"}

THREAD URLS (also valid):
${threadUrls.map((u) => `- ${u}`).join("\n") || "(none)"}

Rules:
- Only use sourceUrl values from the VERIFIED SOURCES or THREAD URLS lists above
- If a finding has no matching URL, set sourceUrl to empty string
- Provide actionable findings that PM and Sales agents can use

COMPETITOR IDENTIFICATION RULES (read carefully):
- A competitor is ONLY a product or company that solves the SAME USER PROBLEM for the SAME TARGET AUDIENCE as described in the product definition above.
- Do NOT include: frameworks, languages, libraries, infrastructure providers, hosting platforms, databases, CI/CD tools, or any technology the product is BUILT WITH. These are part of our tech stack, not competitors.
- Do NOT include: generic SaaS platforms, analytics tools, or developer tools unless they directly compete in our specific product category.
- When in doubt, DO NOT include it. Only include products you are confident a user would evaluate as an alternative to ours.
- For each competitor, the competitivityScore must reflect how directly they compete: 10 = exact same problem and audience, 5 = partial overlap, 1 = barely related.
- If you found zero real competitors in the research, return an empty competitorMoves array. Do not fill it with tangentially related products.`,
      });

      // Save research findings (DB writes only — no LLM calls)
      await saveResearchFindings(ctx, orgId, researchOutput.findings);

      const usage = getUsageTracker();
      if (usage.estimatedCostUsd > 0) {
        await ctx.runMutation(internal.autopilot.cost_guard.recordCost, {
          organizationId: orgId,
          taskId: args.taskId,
          costUsd: usage.estimatedCostUsd,
        });
      }
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "success",
        message: `Market research phase 2a complete: ${researchOutput.findings.length} findings structured`,
        details: `${researchOutput.summary} | LLM usage: ${usage.calls} calls, ${usage.inputTokens + usage.outputTokens} tokens, ~$${usage.estimatedCostUsd.toFixed(4)}`,
      });

      // Schedule Phase 2b: competitor processing + follow-up marking + gap assessment
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.growth.market_research
          .processGrowthResearchPhase2b,
        {
          organizationId: orgId,
          serializedCompetitorMoves: JSON.stringify(
            researchOutput.competitorMoves
          ),
          followUpNoteIds: args.followUpNoteIds,
          taskId: args.taskId,
        }
      );

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "error",
        message: `Market research failed (phase 2a): ${errorMessage}`,
      });
      await markGrowthTaskStatus(ctx, args.taskId, "cancelled");
      return null;
    }
  },
});

/**
 * Phase 2b: Process competitor moves, mark follow-up notes, and run gap assessment.
 * Separated from Phase 2a to keep each action well under the 600s limit.
 */
export const processGrowthResearchPhase2b = internalAction({
  args: {
    organizationId: v.id("organizations"),
    serializedCompetitorMoves: v.string(),
    followUpNoteIds: v.array(v.id("autopilotDocuments")),
    taskId: v.optional(v.id("autopilotWorkItems")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const orgId = args.organizationId;

    try {
      const competitorMoves: z.infer<
        typeof marketResearchSchema
      >["competitorMoves"] = JSON.parse(args.serializedCompetitorMoves);

      await processCompetitorMoves(ctx, orgId, competitorMoves);

      // Mark follow-up notes as processed
      for (const noteId of args.followUpNoteIds) {
        await ctx.runMutation(internal.autopilot.documents.updateDocument, {
          documentId: noteId,
          status: "published",
        });
      }

      await markGrowthTaskStatus(ctx, args.taskId, "done");

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "success",
        message: `Market research phase 2b complete: ${competitorMoves.length} competitor moves processed, ${args.followUpNoteIds.length} follow-ups marked`,
      });

      // Gap assessment (LLM call — runs in this separate action to stay within limits)
      const product = await loadProductContext(ctx, orgId);
      if (product) {
        try {
          await runGapAssessment(ctx, orgId, product);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
            organizationId: orgId,
            agent: "growth",
            level: "warning",
            message: `Gap assessment skipped: ${errorMessage}`,
          });
        }
      }

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "error",
        message: `Market research failed (phase 2b): ${errorMessage}`,
      });
      await markGrowthTaskStatus(ctx, args.taskId, "cancelled");
      return null;
    }
  },
});
