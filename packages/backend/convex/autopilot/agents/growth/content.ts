/**
 * Growth content generation — converts shipped work into distribution content.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import { internalAction } from "../../../_generated/server";
import { MODELS } from "../models";
import { buildAgentPrompt, GROWTH_SYSTEM_PROMPT } from "../prompts";
import { generateObjectWithFallback } from "../shared";
import {
  discoverThreads,
  GROWTH_CONTENT_MODELS,
  type growthContentSchema,
  growthContentSchema as growthSchema,
  type threadDiscoverySchema,
} from "./discovery";

// ============================================
// CONTENT GENERATION
// ============================================

const generateGrowthContent = async (
  productName: string,
  productDescription: string,
  shippedFeatures: string[],
  completedTasks: string[],
  discoveredThreads: z.infer<typeof threadDiscoverySchema>,
  knowledgeContext?: string
): Promise<z.infer<typeof growthContentSchema>> => {
  const systemPrompt = buildAgentPrompt(
    GROWTH_SYSTEM_PROMPT,
    "",
    "",
    knowledgeContext
  );

  const threadsContext = discoveredThreads.threads
    .map(
      (t) =>
        `- [${t.platform}] ${t.title} (${t.url})\n  Suggested angle: ${t.suggestedAngle}`
    )
    .join("\n");

  const prompt = `Generate growth content for ${productName}.

Product: ${productName}
Description: ${productDescription}

Recently shipped features:
${shippedFeatures.map((f) => `- ${f}`).join("\n")}

Completed tasks:
${completedTasks.map((t) => `- ${t}`).join("\n")}

Relevant discussion threads found:
${threadsContext}

Generate 3-5 pieces of content:
1. A Reddit reply to the most relevant thread
2. A LinkedIn post announcing the new features
3. A Twitter/X thread about the updates
4. A HN comment if applicable
5. A short blog post or changelog announcement

Each piece should:
- Be ready to post immediately
- Include the target URL if replying to a specific thread
- Be authentic and provide value first
- Explain why this content should be posted and its expected impact`;

  return await generateObjectWithFallback({
    models: GROWTH_CONTENT_MODELS,
    schema: growthSchema,
    prompt,
    systemPrompt,
  });
};

// ============================================
// MAIN ACTION
// ============================================

/**
 * Run the complete growth generation pipeline.
 */
export const runGrowthGeneration = internalAction({
  args: {
    organizationId: v.id("organizations"),
    triggerReason: v.union(
      v.literal("task_completed"),
      v.literal("pr_merged"),
      v.literal("scheduled"),
      v.literal("on_demand")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    try {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "action",
        message: `Growth generation triggered by: ${args.triggerReason}`,
      });

      const recentItems = await ctx.runQuery(
        internal.autopilot.tasks.getTasksByOrg,
        { organizationId: args.organizationId, status: "done" }
      );

      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const relevantTasks = recentItems
        .filter(
          (item: Doc<"autopilotWorkItems">) => item.updatedAt > sevenDaysAgo
        )
        .slice(0, 5)
        .map((item: Doc<"autopilotWorkItems">) => item.title);

      if (relevantTasks.length === 0) {
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          agent: "growth",
          level: "info",
          message:
            "No completed work items in the past 7 days to generate content from",
        });
        return;
      }

      // Read product context from Knowledge Base first (accurate),
      // fall back to repo analysis if knowledge docs don't exist yet.
      const productDef = await ctx.runQuery(
        internal.autopilot.knowledge.getKnowledgeDocByType,
        { organizationId: args.organizationId, docType: "product_definition" }
      );
      const techArchDoc = await ctx.runQuery(
        internal.autopilot.knowledge.getKnowledgeDocByType,
        {
          organizationId: args.organizationId,
          docType: "technical_architecture",
        }
      );
      const repoAnalysis = await ctx.runQuery(
        internal.autopilot.agents.cto.getRepoAnalysisForCto,
        { organizationId: args.organizationId }
      );
      const repoUrl = await ctx.runQuery(
        internal.autopilot.onboarding.getConnectedRepoUrl,
        { organizationId: args.organizationId }
      );

      const productName = repoUrl
        ? (repoUrl.split("/").pop() ?? "Our Product")
        : "Our Product";
      const productDescription =
        productDef?.contentFull ?? repoAnalysis?.summary ?? "Software product";
      const techStack =
        techArchDoc?.contentSummary ??
        repoAnalysis?.techStack ??
        "TypeScript, React";
      const competitorContext = repoAnalysis?.features ?? "";

      const agentKnowledge = await ctx.runQuery(
        internal.autopilot.agent_context.loadAgentContext,
        { organizationId: args.organizationId, agent: "growth" }
      );

      let discoveredThreads: z.infer<typeof threadDiscoverySchema>;
      try {
        discoveredThreads = await discoverThreads(
          productName,
          productDescription,
          techStack
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          agent: "growth",
          level: "warning",
          message: `Growth Agent: Thread Discovery Failed — ${errorMessage}`,
        });
        return;
      }

      let generatedContent: z.infer<typeof growthContentSchema>;
      try {
        generatedContent = await generateGrowthContent(
          productName,
          productDescription,
          relevantTasks,
          [competitorContext],
          discoveredThreads,
          agentKnowledge
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          agent: "growth",
          level: "warning",
          message: `Growth Agent: Content Generation Failed — ${errorMessage}`,
        });
        return;
      }

      for (const item of generatedContent.items) {
        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: item.type as
            | "blog_post"
            | "reddit_reply"
            | "linkedin_post"
            | "twitter_post"
            | "hn_comment",
          title: item.title,
          content: item.content,
          targetUrl: item.targetUrl,
          status: "pending_review",
          sourceAgent: "growth",
          needsReview: true,
          reviewType: "growth_content",
          tags: ["growth", item.type],
        });
      }

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "action",
        message: `Growth Agent Completed: ${generatedContent.items.length} content pieces from ${relevantTasks.length} recent tasks`,
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "success",
        message: `Growth generation complete: ${generatedContent.items.length} pieces created, ${discoveredThreads.threads.length} threads analyzed`,
        details: JSON.stringify({
          tasksAnalyzed: relevantTasks.length,
          threadsDiscovered: discoveredThreads.threads.length,
          contentPieces: generatedContent.items.length,
          triggerReason: args.triggerReason,
        }),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "error",
        message: `Growth generation failed: ${errorMessage}`,
      });
    }
  },
});

// ============================================
// MARKET RESEARCH ACTION
// ============================================

const MARKET_RESEARCH_MODELS = [
  MODELS.SEARCH_FREE,
  MODELS.SEARCH_PAID,
] as const;

const marketResearchSchema = z.object({
  findings: z.array(
    z.object({
      topic: z.string().describe("Market topic or trend"),
      summary: z.string().describe("Summary of the finding"),
      source: z.string().describe("Where this was found (Reddit, HN, etc.)"),
      relevance: z
        .enum(["high", "medium", "low"])
        .describe("Relevance to the product"),
      opportunity: z.string().describe("What opportunity this represents"),
    })
  ),
  competitorMoves: z.array(
    z.object({
      competitor: z.string().describe("Competitor name"),
      action: z.string().describe("What they did"),
      impact: z.string().describe("How this affects us"),
    })
  ),
  summary: z.string().describe("Executive summary of market research"),
});

/**
 * Run market research — scans communities, creates market notes for PM/Sales.
 */
export const runGrowthMarketResearch = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const agentKnowledge = await ctx.runQuery(
        internal.autopilot.agent_context.loadAgentContext,
        { organizationId: args.organizationId, agent: "growth" }
      );

      // Read product context from Knowledge Base first (accurate),
      // fall back to repo analysis if knowledge docs don't exist yet.
      const productDef = await ctx.runQuery(
        internal.autopilot.knowledge.getKnowledgeDocByType,
        { organizationId: args.organizationId, docType: "product_definition" }
      );
      const techArchDoc = await ctx.runQuery(
        internal.autopilot.knowledge.getKnowledgeDocByType,
        {
          organizationId: args.organizationId,
          docType: "technical_architecture",
        }
      );
      const repoAnalysis = await ctx.runQuery(
        internal.autopilot.agents.cto.getRepoAnalysisForCto,
        { organizationId: args.organizationId }
      );
      const repoUrl = await ctx.runQuery(
        internal.autopilot.onboarding.getConnectedRepoUrl,
        { organizationId: args.organizationId }
      );

      const productName = repoUrl
        ? (repoUrl.split("/").pop() ?? "Our Product")
        : "Our Product";
      const productDescription =
        productDef?.contentFull ?? repoAnalysis?.summary ?? "Software product";
      const techStack =
        techArchDoc?.contentSummary ??
        repoAnalysis?.techStack ??
        "TypeScript, React";

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "action",
        message: "Starting market research scan",
      });

      const discoveredThreads = await discoverThreads(
        productName,
        productDescription,
        techStack
      );

      const systemPrompt = buildAgentPrompt(
        GROWTH_SYSTEM_PROMPT,
        "",
        "",
        agentKnowledge
      );

      const threadsContext = discoveredThreads.threads
        .map(
          (t) =>
            `- [${t.platform}] ${t.title} (${t.url})\n  Relevance: ${t.relevanceScore}/100 | Angle: ${t.suggestedAngle}`
        )
        .join("\n");

      const researchOutput = await generateObjectWithFallback({
        models: MARKET_RESEARCH_MODELS,
        schema: marketResearchSchema,
        systemPrompt,
        prompt: `Analyze these community discussions and extract market intelligence.

Product: ${productName}
Description: ${productDescription}
Tech Stack: ${techStack}

DISCOVERED THREADS:
${threadsContext || "(none found)"}

Identify:
1. Market trends relevant to the product
2. Competitor moves or announcements
3. Opportunities for growth or positioning
4. Community pain points the product can address

Provide actionable findings that PM and Sales agents can use.`,
      });

      for (const finding of researchOutput.findings) {
        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: "market_research",
          title: finding.topic,
          content: `## ${finding.topic}\n\n${finding.summary}\n\n**Source:** ${finding.source}\n**Relevance:** ${finding.relevance}\n**Opportunity:** ${finding.opportunity}`,
          tags: ["market-research", finding.relevance],
          sourceAgent: "growth",
          needsReview: finding.relevance === "high",
          reviewType: "market_research",
        });
      }

      for (const move of researchOutput.competitorMoves) {
        // Create/update competitor record
        const existingCompetitor = await ctx.runQuery(
          internal.autopilot.competitors.findCompetitorByName,
          { organizationId: args.organizationId, name: move.competitor }
        );

        let competitorId: string;
        if (existingCompetitor) {
          competitorId = existingCompetitor._id;
          await ctx.runMutation(
            internal.autopilot.competitors.updateCompetitor,
            {
              competitorId: existingCompetitor._id,
              description: move.action,
            }
          );
        } else {
          competitorId = await ctx.runMutation(
            internal.autopilot.competitors.createCompetitor,
            {
              organizationId: args.organizationId,
              name: move.competitor,
              description: move.action,
            }
          );
        }

        // Link a document to the competitor
        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: "battlecard",
          title: `${move.competitor}: ${move.action}`,
          content: `## ${move.competitor}\n\n**Action:** ${move.action}\n**Impact:** ${move.impact}`,
          tags: ["competitor", move.competitor.toLowerCase()],
          sourceAgent: "growth",
          linkedCompetitorId: competitorId as Id<"autopilotCompetitors">,
        });
      }

      // Create documents for high-relevance findings for Growth page
      for (const finding of researchOutput.findings) {
        if (finding.relevance === "high") {
          await ctx.runMutation(internal.autopilot.documents.createDocument, {
            organizationId: args.organizationId,
            type: "blog_post",
            title: `Market Insight: ${finding.topic}`,
            content: `${finding.summary}\n\nOpportunity: ${finding.opportunity}`,
            status: "draft",
            sourceAgent: "growth",
            tags: ["market-insight"],
          });
        }
      }

      // Complete any in_progress tasks assigned to growth
      await ctx.runMutation(internal.autopilot.tasks.completeAgentTasks, {
        organizationId: args.organizationId,
        agent: "growth",
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "success",
        message: `Market research complete: ${researchOutput.findings.length} findings, ${researchOutput.competitorMoves.length} competitor moves`,
        details: researchOutput.summary,
      });

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "error",
        message: `Market research failed: ${errorMessage}`,
      });

      return null;
    }
  },
});
