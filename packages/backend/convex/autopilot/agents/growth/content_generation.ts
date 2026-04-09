/**
 * Growth content generation — converts shipped work into distribution content
 * and proactively assesses market understanding gaps.
 */

import { v } from "convex/values";
import type { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc } from "../../../_generated/dataModel";
import { internalAction } from "../../../_generated/server";
import { buildAgentPrompt, GROWTH_SYSTEM_PROMPT } from "../prompts";
import {
  generateObjectWithFallback,
  resetUsageTracker,
} from "../shared_generation";
import { saveContentDocuments } from "./content_storage";
import {
  type DiscoveryResult,
  discoverThreads,
  GROWTH_CONTENT_MODELS,
  growthContentSchema as growthSchema,
  type ScoredThread,
} from "./discovery";
import { runGapAssessment } from "./gap_assessment";
import {
  loadProductContext,
  MISSING_PRODUCT_DEF_MESSAGE,
  type ProductContext,
} from "./product_context";

const generateGrowthContent = async (
  product: ProductContext,
  shippedFeatures: string[],
  completedTasks: string[],
  scoredThreads: ScoredThread[]
): Promise<z.infer<typeof growthSchema>> => {
  const systemPrompt = buildAgentPrompt(
    GROWTH_SYSTEM_PROMPT,
    "",
    "",
    product.agentKnowledge
  );

  const threadsContext = scoredThreads
    .filter((t) => !t.isStale)
    .map(
      (t) =>
        `--- THREAD ---
Platform: ${t.platform} (${t.community})
Title: ${t.title}
URL: ${t.url}
Author: ${t.authorName} | Age: ${t.postAge} | Comments: ${t.commentCount}
Relevance: ${t.relevanceScore}/100 — ${t.relevanceReason}
Suggested angle: ${t.suggestedAngle}

Original post:
${t.originalPostContent.slice(0, 1500)}

Top comments already posted:
${t.topComments.length > 0 ? t.topComments.map((c) => `• ${c.slice(0, 300)}`).join("\n") : "(no comments)"}
---`
    )
    .join("\n\n");

  const prompt = `Generate growth content for ${product.productName}.

PRODUCT IDENTITY:
Name: ${product.productName}
Summary: ${product.productSummary}

FULL PRODUCT DEFINITION:
${product.productDescription}

Recently shipped features:
${shippedFeatures.map((f) => `- ${f}`).join("\n")}

Completed tasks:
${completedTasks.map((t) => `- ${t}`).join("\n")}

ENRICHED THREAD DATA (read the actual content carefully):
${threadsContext || "(no qualifying threads found)"}

Generate 3-5 pieces of content:
1. Reddit/HN replies to the most relevant threads (prioritize — these have REAL context now)
2. A LinkedIn post if there's a strong professional angle
3. A Twitter/X post for engagement
4. A blog post or changelog only if there's enough shipped work

For thread replies:
- Acknowledge the SPECIFIC pain points mentioned in the original post
- Reference what existing commenters have said (don't repeat solved answers)
- Mention ${product.productName} naturally — explain what specifically makes it relevant
- Match the community's conversational tone
- Do NOT sound like a marketing pitch

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

/**
 * Phase 1: Discovery — find relevant threads via web search.
 * Schedules Phase 2 with the raw results to stay within the 600s action limit.
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
    const orgId = args.organizationId;

    try {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "action",
        message: `Growth generation triggered by: ${args.triggerReason} (phase 1: discovery)`,
      });

      const recentItems = await ctx.runQuery(
        internal.autopilot.task_queries.getTasksByOrg,
        { organizationId: orgId, status: "done" }
      );

      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const relevantTasks = recentItems
        .filter(
          (item: Doc<"autopilotWorkItems">) => item.updatedAt > sevenDaysAgo
        )
        .slice(0, 5)
        .map((item: Doc<"autopilotWorkItems">) => item.title);

      if (relevantTasks.length === 0) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "growth",
          level: "info",
          message:
            "No completed work items in the past 7 days to generate content from",
        });
        return;
      }

      const product = await loadProductContext(ctx, orgId);
      if (!product) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "growth",
          level: "warning",
          message: MISSING_PRODUCT_DEF_MESSAGE,
        });
        return;
      }

      // Load competitors for query construction
      const competitors = await ctx.runQuery(
        internal.autopilot.competitors.getCompetitorsByOrg,
        { organizationId: orgId }
      );
      const competitorNames = competitors.map(
        (c: Doc<"autopilotCompetitors">) => c.name
      );

      // Load previously found URLs to avoid re-discovering same threads
      const existingGrowthDocs = await ctx.runQuery(
        internal.autopilot.documents.getDocumentsByTags,
        { organizationId: orgId, tags: ["growth"], status: "pending_review" }
      );
      const previousUrls = existingGrowthDocs
        .filter((d: Doc<"autopilotDocuments">) => d.targetUrl)
        .map((d: Doc<"autopilotDocuments">) => d.targetUrl as string);

      // 4-stage discovery pipeline: query → search → enrich → score
      const discoveryResult = await discoverThreads(
        product.productName,
        product.productDescription,
        competitorNames,
        previousUrls
      );

      if (discoveryResult.searchCostUsd > 0) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "growth",
          level: "info",
          message: `Discovery pipeline: ${discoveryResult.queriesRun} queries → ${discoveryResult.threadsDiscovered} found → ${discoveryResult.threadsEnriched} enriched → ${discoveryResult.threadsQualified} qualified (Exa cost: $${discoveryResult.searchCostUsd.toFixed(4)})`,
        });
      }

      // Schedule Phase 2 with discovery results
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.growth.content_generation
          .processGrowthGenerationResults,
        {
          organizationId: orgId,
          triggerReason: args.triggerReason,
          serializedThreads: JSON.stringify(discoveryResult),
          serializedRelevantTasks: JSON.stringify(relevantTasks),
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "error",
        message: `Growth generation failed (discovery phase): ${errorMessage}`,
      });
    }
  },
});

/**
 * Phase 2: Process discovery results — generate content, save documents,
 * and assess market gaps.
 */
export const processGrowthGenerationResults = internalAction({
  args: {
    organizationId: v.id("organizations"),
    triggerReason: v.union(
      v.literal("task_completed"),
      v.literal("pr_merged"),
      v.literal("scheduled"),
      v.literal("on_demand")
    ),
    serializedThreads: v.string(),
    serializedRelevantTasks: v.string(),
  },
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
        return;
      }

      const discoveryResult: DiscoveryResult = JSON.parse(
        args.serializedThreads
      );
      const relevantTasks: string[] = JSON.parse(args.serializedRelevantTasks);

      const generatedContent = await generateGrowthContent(
        product,
        relevantTasks,
        [],
        discoveryResult.threads
      );

      const { saved, dropped } = await saveContentDocuments(
        ctx,
        orgId,
        generatedContent.items,
        discoveryResult.threads
      );

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "success",
        message: `Growth generation complete: ${saved} saved, ${dropped} dropped (cap), ${discoveryResult.threadsQualified} qualified threads`,
        details: JSON.stringify({
          tasksAnalyzed: relevantTasks.length,
          threadsDiscovered: discoveryResult.threadsDiscovered,
          threadsEnriched: discoveryResult.threadsEnriched,
          threadsQualified: discoveryResult.threadsQualified,
          contentPieces: generatedContent.items.length,
          contentSaved: saved,
          contentDropped: dropped,
          triggerReason: args.triggerReason,
        }),
      });

      // After content generation, assess market gaps for proactive follow-up
      try {
        await runGapAssessment(ctx, orgId, product);
      } catch {
        // Gap assessment is non-critical
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "error",
        message: `Growth generation failed (processing phase): ${errorMessage}`,
      });
    }
  },
});
