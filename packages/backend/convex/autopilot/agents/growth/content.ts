/**
 * Growth content generation — converts shipped work into distribution content.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc } from "../../../_generated/dataModel";
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
      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "growth_post",
        title: "Growth Agent Started",
        summary: `Growth generation triggered by: ${args.triggerReason}`,
        sourceAgent: "growth",
        priority: "medium",
        content:
          "Growth Agent is analyzing recent work to generate distribution content.",
        autoApproved: true,
      });

      const recentTasks = await ctx.runQuery(
        internal.autopilot.tasks.getTasksByOrg,
        { organizationId: args.organizationId, status: "completed" }
      );

      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const relevantTasks = recentTasks
        .filter(
          (task: Doc<"autopilotTasks">) =>
            task.completedAt && task.completedAt > sevenDaysAgo
        )
        .slice(0, 5)
        .map((task: Doc<"autopilotTasks">) => task.title);

      if (relevantTasks.length === 0) {
        await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
          organizationId: args.organizationId,
          type: "growth_post",
          title: "Growth Agent: No Recent Work",
          summary:
            "No completed tasks in the past 7 days to generate content from",
          sourceAgent: "growth",
          priority: "low",
          autoApproved: true,
        });
        return;
      }

      const repoAnalysis = await ctx.runQuery(
        internal.autopilot.agents.cto.getRepoAnalysisForCto,
        { organizationId: args.organizationId }
      );

      const productName = repoAnalysis?.summary
        ? repoAnalysis.summary.split(" ")[0]
        : "Our Product";
      const productDescription =
        repoAnalysis?.summary ?? "Software product with AI-powered features";
      const techStack = repoAnalysis?.techStack ?? "TypeScript, React";
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
        await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
          organizationId: args.organizationId,
          type: "growth_post",
          title: "Growth Agent: Thread Discovery Failed",
          summary: `Failed to discover relevant threads: ${errorMessage}`,
          sourceAgent: "growth",
          priority: "low",
          content: errorMessage,
          autoApproved: true,
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
        await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
          organizationId: args.organizationId,
          type: "growth_post",
          title: "Growth Agent: Content Generation Failed",
          summary: `Failed to generate content: ${errorMessage}`,
          sourceAgent: "growth",
          priority: "low",
          content: errorMessage,
          autoApproved: true,
        });
        return;
      }

      for (const item of generatedContent.items) {
        const growthItemId = await ctx.runMutation(
          internal.autopilot.growthItems.createGrowthItem,
          {
            organizationId: args.organizationId,
            type: item.type,
            title: item.title,
            content: item.content,
            targetUrl: item.targetUrl,
            status: "pending_review" as const,
          }
        );

        await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
          organizationId: args.organizationId,
          type: "growth_post",
          title: `Review: ${item.type} - ${item.title}`,
          summary: item.reasoning,
          content: item.content,
          sourceAgent: "growth",
          priority: "medium",
          actionUrl: item.targetUrl,
          metadata: JSON.stringify({
            growthItemId,
            contentType: item.type,
            platformUrl: item.targetUrl,
          }),
        });
      }

      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "growth_post",
        title: "Growth Agent Completed",
        summary: `Generated ${generatedContent.items.length} content pieces from ${relevantTasks.length} recent tasks`,
        content: generatedContent.summary,
        sourceAgent: "growth",
        priority: "low",
        autoApproved: true,
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

      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "growth_post",
        title: "Growth Agent Error",
        summary: `Growth generation failed: ${errorMessage}`,
        sourceAgent: "growth",
        priority: "high",
        content: errorMessage,
        autoApproved: true,
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

      const repoAnalysis = await ctx.runQuery(
        internal.autopilot.agents.cto.getRepoAnalysisForCto,
        { organizationId: args.organizationId }
      );

      const productName = repoAnalysis?.summary
        ? repoAnalysis.summary.split(" ")[0]
        : "Our Product";
      const productDescription =
        repoAnalysis?.summary ?? "Software product with AI-powered features";
      const techStack = repoAnalysis?.techStack ?? "TypeScript, React";

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
        await ctx.runMutation(internal.autopilot.notes.createNote, {
          organizationId: args.organizationId,
          type: "research",
          category: "market",
          title: finding.topic,
          description: `${finding.summary}\n\nSource: ${finding.source}\nOpportunity: ${finding.opportunity}`,
          sourceAgent: "growth",
          priority: finding.relevance === "high" ? "high" : "medium",
        });
      }

      for (const move of researchOutput.competitorMoves) {
        await ctx.runMutation(internal.autopilot.notes.createNote, {
          organizationId: args.organizationId,
          type: "alert",
          category: "market",
          title: `Competitor: ${move.competitor} — ${move.action}`,
          description: `Impact: ${move.impact}`,
          sourceAgent: "growth",
          priority: "high",
        });
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
