/**
 * Growth content generation — converts shipped work into distribution content
 * and proactively assesses market understanding gaps.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { internalAction } from "../../../_generated/server";
import { WEB_SEARCH_MODELS } from "../models";
import { buildAgentPrompt, GROWTH_SYSTEM_PROMPT } from "../prompts";
import {
  generateObjectWithFallback,
  generateTextWithWebSearch,
  getUsageTracker,
  resetUsageTracker,
  validateUrl,
} from "../shared";
import {
  assessMarketGaps,
  discoverThreads,
  GROWTH_CONTENT_MODELS,
  type growthContentSchema,
  growthContentSchema as growthSchema,
  type threadDiscoverySchema,
} from "./discovery";

// ============================================
// SHARED HELPERS
// ============================================

interface ProductContext {
  agentKnowledge: string;
  /** Full product definition markdown from the knowledge base. */
  productDescription: string;
  /** Human-readable product name extracted from the knowledge base. */
  productName: string;
  /** 1-2 sentence summary for use in compact prompts. */
  productSummary: string;
}

// Regex patterns for product name extraction (top-level for performance)
const HEADING_PATTERN = /^#{1,2}\s+(.+?)(?:\s*[-—:|]|$)/m;
const SENTENCE_SPLIT_PATTERN = /[.!]/;
const NAME_IS_PATTERN = /^(.+?)\s+(?:is|—|:)\s/;
const GENERIC_HEADINGS = ["product definition", "overview"];

/**
 * Extract the product name from a knowledge doc.
 *
 * Tries (in order):
 *   1. The doc title if it's more specific than "Product Definition"
 *   2. The first H1/H2 heading in the content
 *   3. The first sentence of the summary (pattern: "X is a ...")
 */
const extractProductName = (productDef: {
  title: string;
  contentFull: string;
  contentSummary: string;
}): string => {
  // Use doc title if it's specific (not just "Product Definition")
  const title = productDef.title.trim();
  if (title && !title.toLowerCase().includes("product definition")) {
    return title;
  }

  // Try to find the product name from the first heading
  const headingMatch = productDef.contentFull.match(HEADING_PATTERN);
  if (headingMatch?.[1]) {
    const heading = headingMatch[1].trim();
    const headingLower = heading.toLowerCase();
    // Skip generic headings
    if (
      !GENERIC_HEADINGS.some((g) => headingLower.includes(g)) &&
      heading.length < 80
    ) {
      return heading;
    }
  }

  // Try the first sentence of the summary — often "X is a ..."
  const sentences = productDef.contentSummary.split(SENTENCE_SPLIT_PATTERN);
  const firstSentence = sentences[0]?.trim();
  if (firstSentence) {
    const isAMatch = firstSentence.match(NAME_IS_PATTERN);
    if (isAMatch?.[1] && isAMatch[1].length < 60) {
      return isAMatch[1];
    }
  }

  // Last resort: use the summary itself (capped)
  return productDef.contentSummary.slice(0, 60);
};

/**
 * Load product context for Growth from the Knowledge Base.
 *
 * Growth should understand the product from the curated product definition,
 * NOT from raw codebase analysis. The repo analysis contains tech stack details
 * (React, Next.js, etc.) which Growth would incorrectly classify as competitors.
 * Tech stack data is for CTO/Dev agents only.
 *
 * Returns null if no product definition exists — callers must bail early.
 */
const loadProductContext = async (
  ctx: { runQuery: ActionCtx["runQuery"] },
  organizationId: Id<"organizations">
): Promise<ProductContext | null> => {
  const productDef = await ctx.runQuery(
    internal.autopilot.knowledge.getKnowledgeDocByType,
    { organizationId, docType: "product_definition" }
  );

  if (!productDef) {
    return null;
  }

  const agentKnowledge = await ctx.runQuery(
    internal.autopilot.agent_context.loadAgentContext,
    { organizationId, agent: "growth" }
  );

  return {
    productName: extractProductName(productDef),
    productDescription: productDef.contentFull,
    productSummary: productDef.contentSummary,
    agentKnowledge,
  };
};

const MISSING_PRODUCT_DEF_MESSAGE =
  "Growth agent skipped — no product definition found in the Knowledge Base. " +
  "Run the onboarding or manually create a product definition so Growth knows what the product is.";

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
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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

// ============================================
// CONTENT GENERATION
// ============================================

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

// ============================================
// GAP ASSESSMENT — self-driven follow-up work
// ============================================

const runGapAssessment = async (
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
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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

  await ctx.runMutation(internal.autopilot.tasks.logActivity, {
    organizationId,
    agent: "growth",
    level: "info",
    message: `Market understanding: ${gaps.marketUnderstandingScore}/100 — created ${gapsToWrite.length} follow-up notes (${existingFollowUps.length} already pending)`,
  });
};

// ============================================
// MAIN ACTION
// ============================================

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
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "action",
        message: `Growth generation triggered by: ${args.triggerReason} (phase 1: discovery)`,
      });

      const recentItems = await ctx.runQuery(
        internal.autopilot.tasks.getTasksByOrg,
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
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
        internal.autopilot.agents.growth.content.processGrowthGenerationResults,
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
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "error",
        message: `Growth generation failed (processing phase): ${errorMessage}`,
      });
    }
  },
});

// ============================================
// MARKET RESEARCH ACTION
// ============================================

const marketResearchSchema = z.object({
  findings: z.array(
    z.object({
      topic: z.string().describe("Market topic or trend"),
      summary: z.string().describe("Summary of the finding"),
      source: z.string().describe("Where this was found (Reddit, HN, etc.)"),
      sourceUrl: z
        .string()
        .describe(
          "Direct URL to the thread or page where this was found. Must be a full URL starting with https://. Empty string if no specific URL."
        ),
      relevance: z
        .enum(["high", "medium", "low"])
        .describe("Relevance to the product"),
      opportunity: z.string().describe("What opportunity this represents"),
    })
  ),
  competitorMoves: z.array(
    z.object({
      competitor: z
        .string()
        .describe(
          "Name of a competing PRODUCT or COMPANY — NOT a framework, language, or tool from our tech stack"
        ),
      competitivityScore: z
        .number()
        .min(1)
        .max(10)
        .describe(
          "How directly they compete: 10 = exact same problem and audience, 5 = partial overlap, 1 = barely related (should probably not be included)"
        ),
      action: z.string().describe("What they did"),
      impact: z.string().describe("How this affects us"),
      sourceUrl: z
        .string()
        .describe("Direct URL to the source. Empty string if no specific URL."),
    })
  ),
  summary: z.string().describe("Executive summary of market research"),
});

/**
 * Common frameworks/languages/tools that are NOT competitors.
 * Used as a safety net — if the LLM still classifies tech stack as competitors,
 * we filter them out before saving.
 */
const TECH_STACK_BLOCKLIST = new Set([
  "react",
  "next.js",
  "nextjs",
  "remix",
  "astro",
  "vue",
  "nuxt",
  "svelte",
  "sveltekit",
  "angular",
  "typescript",
  "javascript",
  "node.js",
  "nodejs",
  "deno",
  "bun",
  "tailwind",
  "tailwindcss",
  "shadcn",
  "radix",
  "prisma",
  "drizzle",
  "convex",
  "supabase",
  "firebase",
  "vercel",
  "netlify",
  "aws",
  "docker",
  "kubernetes",
  "postgres",
  "postgresql",
  "mongodb",
  "redis",
  "graphql",
  "trpc",
  "express",
  "fastify",
  "hono",
  "vite",
  "webpack",
  "turbopack",
  "biome",
  "eslint",
  "prettier",
  "python",
  "go",
  "rust",
  "java",
  "stripe",
  "openai",
  "anthropic",
  "langchain",
]);

/** Safety net: skip if LLM still misclassifies a framework as a competitor. */
const isTechStackItem = (name: string): boolean =>
  TECH_STACK_BLOCKLIST.has(name.toLowerCase().trim());

// Inline Jaccard similarity for move dedup (bigrams on action text)
const MOVE_SIMILARITY_THRESHOLD = 0.75;

const getMovesBigrams = (str: string): Set<string> => {
  const normalized = str.toLowerCase().trim();
  const bigrams = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    bigrams.add(normalized.slice(i, i + 2));
  }
  return bigrams;
};

const movesJaccardSimilarity = (a: string, b: string): number => {
  const bigramsA = getMovesBigrams(a);
  const bigramsB = getMovesBigrams(b);
  if (bigramsA.size === 0 && bigramsB.size === 0) {
    return 1;
  }
  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) {
      intersection++;
    }
  }
  const union = bigramsA.size + bigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

const processCompetitorMoves = async (
  ctx: {
    runQuery: ActionCtx["runQuery"];
    runMutation: ActionCtx["runMutation"];
  },
  organizationId: Id<"organizations">,
  moves: z.infer<typeof marketResearchSchema>["competitorMoves"]
) => {
  for (const move of moves) {
    if (isTechStackItem(move.competitor)) {
      continue;
    }
    // Skip loosely-related entries (score < 5 means too tangential to track)
    if (move.competitivityScore < 5) {
      continue;
    }

    const existingCompetitor = await ctx.runQuery(
      internal.autopilot.competitors.findCompetitorByName,
      { organizationId, name: move.competitor }
    );

    // Dedup: skip if a similar action already exists in the competitor's moves
    if (existingCompetitor?.moves) {
      const isDuplicate = existingCompetitor.moves.some(
        (m) =>
          movesJaccardSimilarity(m.action, move.action) >=
          MOVE_SIMILARITY_THRESHOLD
      );
      if (isDuplicate) {
        continue;
      }
    }

    let validSourceUrl: string | undefined;
    if (move.sourceUrl) {
      const validation = await validateUrl(move.sourceUrl);
      validSourceUrl = validation.valid ? move.sourceUrl : undefined;
    }

    const moveObj = {
      action: move.action,
      impact: move.impact,
      sourceUrl: validSourceUrl,
      competitivityScore: move.competitivityScore,
      recordedAt: Date.now(),
    };

    if (existingCompetitor) {
      await ctx.runMutation(internal.autopilot.competitors.updateCompetitor, {
        competitorId: existingCompetitor._id,
        moveToAppend: moveObj,
        competitivityScore: move.competitivityScore,
      });
    } else {
      await ctx.runMutation(internal.autopilot.competitors.createCompetitor, {
        organizationId,
        name: move.competitor,
        moves: [moveObj],
        competitivityScore: move.competitivityScore,
      });
    }
  }
};

type ResearchFindings = z.infer<typeof marketResearchSchema>["findings"];

const saveResearchFindings = async (
  ctx: {
    runMutation: ActionCtx["runMutation"];
    runQuery: ActionCtx["runQuery"];
  },
  organizationId: Id<"organizations">,
  findings: ResearchFindings
): Promise<void> => {
  // Batch dedup check — single query instead of N individual queries
  const dedupResults = await ctx.runQuery(
    internal.autopilot.dedup.findSimilarGrowthItems,
    { organizationId, titles: findings.map((f) => f.topic) }
  );
  const existingTopics = new Set(
    dedupResults.filter((r) => r.existingId !== null).map((r) => r.title)
  );

  for (const finding of findings) {
    if (existingTopics.has(finding.topic)) {
      continue;
    }
    let validSourceUrl = finding.sourceUrl;
    if (validSourceUrl) {
      const validation = await validateUrl(validSourceUrl);
      if (!validation.valid) {
        validSourceUrl = "";
      }
    }

    const sourceLabel = validSourceUrl
      ? `[${finding.source}](${validSourceUrl})`
      : finding.source;
    const sourceUrls = validSourceUrl ? [validSourceUrl] : undefined;

    await ctx.runMutation(internal.autopilot.documents.createDocument, {
      organizationId,
      type: "market_research",
      title: finding.topic,
      content: `## ${finding.topic}\n\n${finding.summary}\n\n**Source:** ${sourceLabel}\n**Relevance:** ${finding.relevance}\n**Opportunity:** ${finding.opportunity}`,
      tags: ["market-research", finding.relevance],
      sourceAgent: "growth",
      sourceUrls,
      needsReview: false,
      reviewType: "market_research",
    });

    if (finding.relevance === "high") {
      await ctx.runMutation(internal.autopilot.documents.createDocument, {
        organizationId,
        type: "blog_post",
        title: `Market Insight: ${finding.topic}`,
        content: `${finding.summary}\n\nOpportunity: ${finding.opportunity}`,
        status: "draft",
        sourceAgent: "growth",
        tags: ["market-insight"],
      });
    }
  }
};

/**
 * Phase 1: Discovery — web search for community discussions and market intel.
 * Schedules Phase 2 with the raw results to stay within the 600s action limit.
 */
export const runGrowthMarketResearch = internalAction({
  args: { organizationId: v.id("organizations") },
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
        return null;
      }

      resetUsageTracker();
      const product = await loadProductContext(ctx, orgId);
      if (!product) {
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: orgId,
          agent: "growth",
          level: "warning",
          message: MISSING_PRODUCT_DEF_MESSAGE,
        });
        return null;
      }

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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

      const discoveredThreads = await discoverThreads(
        product.productName,
        product.productDescription
      );

      const systemPrompt = buildAgentPrompt(
        GROWTH_SYSTEM_PROMPT,
        "",
        "",
        product.agentKnowledge
      );

      const threadsContext = discoveredThreads.threads
        .map(
          (t) =>
            `- [${t.platform}] ${t.title} (${t.url})\n  Relevance: ${t.relevanceScore}/100 | Angle: ${t.suggestedAngle}`
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
        internal.autopilot.agents.growth.content.processGrowthResearchResults,
        {
          organizationId: orgId,
          deepResearchText,
          serializedCitations: JSON.stringify(deepCitations),
          serializedThreadUrls: JSON.stringify(
            discoveredThreads.threads.map((t) => t.url)
          ),
          followUpNoteIds,
        }
      );

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "error",
        message: `Market research failed (discovery phase): ${errorMessage}`,
      });
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const orgId = args.organizationId;

    try {
      resetUsageTracker();
      const product = await loadProductContext(ctx, orgId);
      if (!product) {
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: orgId,
          agent: "growth",
          level: "warning",
          message: MISSING_PRODUCT_DEF_MESSAGE,
        });
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
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "success",
        message: `Market research phase 2a complete: ${researchOutput.findings.length} findings structured`,
        details: `${researchOutput.summary} | LLM usage: ${usage.calls} calls, ${usage.inputTokens + usage.outputTokens} tokens, ~$${usage.estimatedCostUsd.toFixed(4)}`,
      });

      // Schedule Phase 2b: competitor processing + follow-up marking + gap assessment
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.growth.content.processGrowthResearchPhase2b,
        {
          organizationId: orgId,
          serializedCompetitorMoves: JSON.stringify(
            researchOutput.competitorMoves
          ),
          followUpNoteIds: args.followUpNoteIds,
        }
      );

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "error",
        message: `Market research failed (phase 2a): ${errorMessage}`,
      });
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

      await ctx.runMutation(internal.autopilot.tasks.completeAgentTasks, {
        organizationId: orgId,
        agent: "growth",
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
        } catch {
          // Gap assessment is non-critical
        }
      }

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: orgId,
        agent: "growth",
        level: "error",
        message: `Market research failed (phase 2b): ${errorMessage}`,
      });
      return null;
    }
  },
});
