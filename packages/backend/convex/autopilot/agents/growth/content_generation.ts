/**
 * Growth content generation — converts shipped work into distribution content
 * and proactively assesses market understanding gaps.
 */

import { v } from "convex/values";
import type { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { internalAction } from "../../../_generated/server";
import { buildAgentPrompt, GROWTH_SYSTEM_PROMPT } from "../prompts";
import {
  generateObjectWithFallback,
  resetUsageTracker,
} from "../shared_generation";
import { validateUrl } from "../shared_web";
import {
  assessMarketGaps,
  discoverThreads,
  GROWTH_CONTENT_MODELS,
  type growthContentSchema,
  growthContentSchema as growthSchema,
  type threadDiscoverySchema,
} from "./discovery";
import {
  loadProductContext,
  MISSING_PRODUCT_DEF_MESSAGE,
  type ProductContext,
} from "./product_context";

const saveContentDocuments = async (
  ctx: {
    runMutation: ActionCtx["runMutation"];
    runQuery: ActionCtx["runQuery"];
  },
  organizationId: Id<"organizations">,
  items: z.infer<typeof growthContentSchema>["items"]
): Promise<void> => {
  // Batch dedup check — single query instead of N individual queries
  const dedupResults = await ctx.runQuery(
    internal.autopilot.dedup.findSimilarGrowthItems,
    { organizationId, titles: items.map((i) => i.title) }
  );
  const existingTitles = new Set(
    dedupResults.filter((r) => r.existingId !== null).map((r) => r.title)
  );

  for (const item of items) {
    if (existingTitles.has(item.title)) {
      continue;
    }
    let validatedTargetUrl = item.targetUrl;
    if (validatedTargetUrl) {
      const validation = await validateUrl(validatedTargetUrl);
      if (!validation.valid) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId,
          agent: "growth",
          level: "info",
          message: `Dropped invalid targetUrl: ${validatedTargetUrl} (${validation.reason})`,
        });
        validatedTargetUrl = "";
      }
    }

    await ctx.runMutation(internal.autopilot.documents.createDocument, {
      organizationId,
      type: item.type as
        | "blog_post"
        | "reddit_reply"
        | "linkedin_post"
        | "twitter_post"
        | "hn_comment",
      title: item.title,
      content: item.content,
      targetUrl: validatedTargetUrl,
      status: "pending_review",
      sourceAgent: "growth",
      needsReview: true,
      reviewType: "growth_content",
      tags: ["growth", item.type],
    });
  }
};

const generateGrowthContent = async (
  product: ProductContext,
  shippedFeatures: string[],
  completedTasks: string[],
  discoveredThreads: z.infer<typeof threadDiscoverySchema>
): Promise<z.infer<typeof growthContentSchema>> => {
  const systemPrompt = buildAgentPrompt(
    GROWTH_SYSTEM_PROMPT,
    "",
    "",
    product.agentKnowledge
  );

  const threadsContext = discoveredThreads.threads
    .map(
      (t) =>
        `- [${t.platform}] ${t.title} (${t.url})\n  Suggested angle: ${t.suggestedAngle}`
    )
    .join("\n");

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

export const runGapAssessment = async (
  ctx: {
    runQuery: ActionCtx["runQuery"];
    runMutation: ActionCtx["runMutation"];
  },
  organizationId: Id<"organizations">,
  product: ProductContext
): Promise<void> => {
  // Gather existing research for context
  const existingDocs = await ctx.runQuery(
    internal.autopilot.documents.getDocumentsByOrg,
    { organizationId, type: "market_research" }
  );
  const existingResearchSummary = existingDocs
    .slice(0, 10)
    .map((d: Doc<"autopilotDocuments">) => `- ${d.title}`)
    .join("\n");

  const competitors = await ctx.runQuery(
    internal.autopilot.competitors.getCompetitorsByOrg,
    { organizationId }
  );
  const competitorNames = competitors.map(
    (c: Doc<"autopilotCompetitors">) => c.name
  );

  // Cap: don't create more follow-up notes if there are already unprocessed ones
  const MAX_PENDING_FOLLOWUPS = 5;
  const existingFollowUps = await ctx.runQuery(
    internal.autopilot.documents.getDocumentsByTags,
    { organizationId, tags: ["growth-followup"], status: "draft" }
  );
  if (existingFollowUps.length >= MAX_PENDING_FOLLOWUPS) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "growth",
      level: "info",
      message: `Gap assessment skipped — ${existingFollowUps.length} unprocessed follow-up notes already pending`,
    });
    return;
  }

  const gaps = await assessMarketGaps(
    product.productName,
    product.productDescription,
    existingResearchSummary,
    competitorNames
  );

  // Only write follow-up notes if there are real gaps
  if (gaps.gaps.length === 0 || gaps.marketUnderstandingScore > 85) {
    return;
  }

  // Cap new notes to stay under the limit
  const slotsAvailable = MAX_PENDING_FOLLOWUPS - existingFollowUps.length;
  const gapsToWrite = gaps.gaps.slice(0, slotsAvailable);

  for (const gap of gapsToWrite) {
    // Dedup: skip if a similar follow-up note already exists
    const existing = await ctx.runQuery(
      internal.autopilot.dedup.findSimilarGrowthItem,
      { organizationId, title: `Growth follow-up: ${gap.topic}` }
    );
    if (existing) {
      continue;
    }

    await ctx.runMutation(internal.autopilot.documents.createDocument, {
      organizationId,
      type: "note",
      title: `Growth follow-up: ${gap.topic}`,
      content: `## ${gap.topic}\n\n${gap.reasoning}\n\n**Suggested searches:**\n${gap.suggestedSearchTerms.map((t) => `- ${t}`).join("\n")}`,
      tags: ["growth-followup"],
      sourceAgent: "growth",
    });
  }

  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId,
    agent: "growth",
    level: "info",
    message: `Market understanding: ${gaps.marketUnderstandingScore}/100 — created ${gapsToWrite.length} follow-up notes (${existingFollowUps.length} already pending)`,
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

      const discoveredThreads = await discoverThreads(
        product.productName,
        product.productDescription
      );

      // Schedule Phase 2 with discovery results
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.growth.content_generation
          .processGrowthGenerationResults,
        {
          organizationId: orgId,
          triggerReason: args.triggerReason,
          serializedThreads: JSON.stringify(discoveredThreads),
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

      const discoveredThreads: z.infer<typeof threadDiscoverySchema> =
        JSON.parse(args.serializedThreads);
      const relevantTasks: string[] = JSON.parse(args.serializedRelevantTasks);

      const generatedContent = await generateGrowthContent(
        product,
        relevantTasks,
        [],
        discoveredThreads
      );

      await saveContentDocuments(ctx, orgId, generatedContent.items);

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
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
