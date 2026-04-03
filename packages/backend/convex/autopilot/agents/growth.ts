/**
 * Growth Agent — converts shipped work into distribution content.
 *
 * Flow:
 *   1. Load recently completed tasks and merged PRs
 *   2. Load org's product info (repo analysis, tech stack, description)
 *   3. Load intelligence insights (community signals, competitor data)
 *   4. Phase 1: Search online for relevant threads (Reddit, HN, LinkedIn)
 *   5. Phase 2: Generate ready-to-post content for each platform
 *   6. Create autopilotGrowthItems records
 *   7. Create inbox items for approval
 *   8. Log all activity
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";
import { MODELS } from "./models";
import { buildAgentPrompt, GROWTH_SYSTEM_PROMPT } from "./prompts";
import { generateObjectWithFallback } from "./shared";

// Online search-capable models for thread discovery
const GROWTH_SEARCH_MODELS = [MODELS.SEARCH_FREE, MODELS.SEARCH_PAID] as const;

// Content generation models (non-online for speed)
const GROWTH_CONTENT_MODELS = [MODELS.FREE, MODELS.FAST] as const;

// ============================================
// ZOD SCHEMAS
// ============================================

export const threadDiscoverySchema = z.object({
  threads: z.array(
    z.object({
      platform: z.enum(["reddit", "hackernews", "linkedin", "twitter"]),
      url: z.string().url(),
      title: z.string(),
      relevanceScore: z.number().min(0).max(100),
      suggestedAngle: z.string(),
    })
  ),
});

export const growthContentSchema = z.object({
  items: z.array(
    z.object({
      type: z.enum([
        "reddit_reply",
        "linkedin_post",
        "twitter_post",
        "hn_comment",
        "blog_post",
        "email_campaign",
        "changelog_announce",
      ]),
      title: z.string(),
      content: z
        .string()
        .describe("The full pre-written content, ready to post"),
      targetUrl: z
        .string()
        .default("")
        .describe(
          "URL of the thread/post to reply to, or empty string if not applicable"
        ),
      reasoning: z
        .string()
        .describe("Why this content was generated and its expected impact"),
    })
  ),
  summary: z.string().describe("Executive summary of generated content"),
});

// ============================================
// ============================================
// PHASE 1: THREAD DISCOVERY
// ============================================

const discoverThreads = async (
  productName: string,
  productDescription: string,
  techStack: string
): Promise<z.infer<typeof threadDiscoverySchema>> => {
  const systemPrompt = `You are an expert growth marketer who finds relevant online discussions where a product could provide value.

Search for recent threads where:
- People ask about problems the product solves
- Competitors are discussed
- The product's tech stack or domain is relevant
- People are looking for alternatives

Focus on finding REAL threads where your product could naturally be mentioned without being promotional.

Return the most relevant URLs you find.`;

  const prompt = `Find relevant threads about ${productName}.

Product: ${productName}
Description: ${productDescription}
Tech Stack: ${techStack}

Search for discussions on Reddit, Hacker News, LinkedIn, and Twitter where our product could add value.
Find threads where people are asking about problems we solve, discussing competitors, or looking for alternatives.

Return 5-10 of the most relevant threads with high relevance scores (70+).`;

  return await generateObjectWithFallback({
    models: GROWTH_SEARCH_MODELS,
    schema: threadDiscoverySchema,
    prompt,
    systemPrompt,
  });
};

// ============================================
// PHASE 2: CONTENT GENERATION
// ============================================

const generateGrowthContent = async (
  productName: string,
  productDescription: string,
  shippedFeatures: string[],
  completedTasks: string[],
  discoveredThreads: z.infer<typeof threadDiscoverySchema>
): Promise<z.infer<typeof growthContentSchema>> => {
  const systemPrompt = buildAgentPrompt(GROWTH_SYSTEM_PROMPT, "", "");

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
    schema: growthContentSchema,
    prompt,
    systemPrompt,
  });
};

// ============================================
// MAIN ACTION
// ============================================

/**
 * Run the complete growth generation pipeline.
 * Triggered by task completion, PR merge, scheduled runs, or manual requests.
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
      // Log start
      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "growth_post",
        title: "Growth Agent Started",
        summary: `Growth generation triggered by: ${args.triggerReason}`,
        sourceAgent: "growth",
        priority: "medium",
        content:
          "Growth Agent is analyzing recent work to generate distribution content.",
      });

      // Step 1: Load recently completed tasks and merged PRs
      const recentTasks = await ctx.runQuery(
        internal.autopilot.tasks.getTasksByOrg,
        {
          organizationId: args.organizationId,
          status: "completed",
        }
      );

      // Get last 5 completed tasks from the last 7 days
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
        });
        return;
      }

      // Step 2: Load org's product info from repo analysis
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

      // Step 3: Load intelligence insights
      const competitorContext = repoAnalysis?.features ?? "";

      // Step 4: Phase 1 - Discover relevant threads
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
        });

        return;
      }

      // Step 5: Phase 2 - Generate content for each platform
      let generatedContent: z.infer<typeof growthContentSchema>;

      try {
        generatedContent = await generateGrowthContent(
          productName,
          productDescription,
          relevantTasks,
          [competitorContext],
          discoveredThreads
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
        });

        return;
      }

      // Step 6: Create autopilotGrowthItems and inbox items for each content piece
      for (const item of generatedContent.items) {
        // Create growth item in database
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

        // Create inbox item for review
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

      // Step 7: Log success
      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "growth_post",
        title: "Growth Agent Completed",
        summary: `Generated ${generatedContent.items.length} content pieces from ${relevantTasks.length} recent tasks`,
        content: generatedContent.summary,
        sourceAgent: "growth",
        priority: "low",
      });

      // Log activity
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

      // Log failure
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
      });
    }
  },
});
