/**
 * Market research helpers — schema, tech stack blocklist, dedup logic,
 * and DB persistence for competitor moves and research findings.
 */

import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { validateUrl } from "../shared_web";

// ============================================
// SCHEMAS
// ============================================

export const marketResearchSchema = z.object({
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

// ============================================
// TECH STACK BLOCKLIST
// ============================================

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

// ============================================
// MOVE DEDUP (JACCARD SIMILARITY)
// ============================================

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

// ============================================
// HELPERS
// ============================================

export const processCompetitorMoves = async (
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

export type ResearchFindings = z.infer<typeof marketResearchSchema>["findings"];

const MAX_PENDING_RESEARCH_DOCS = 15;
const MAX_PENDING_BLOG_POSTS = 3;

export const saveResearchFindings = async (
  ctx: {
    runMutation: ActionCtx["runMutation"];
    runQuery: ActionCtx["runQuery"];
  },
  organizationId: Id<"organizations">,
  findings: ResearchFindings
): Promise<void> => {
  // Check existing research backlog
  const existingResearch = await ctx.runQuery(
    internal.autopilot.documents.getDocumentsByOrg,
    { organizationId, type: "market_research" }
  );
  const pendingResearchCount = existingResearch.filter(
    (d) => d.status === "draft" || d.status === "pending_review"
  ).length;

  if (pendingResearchCount >= MAX_PENDING_RESEARCH_DOCS) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "growth",
      level: "info",
      message: `Research save skipped — backlog full (${pendingResearchCount}/${MAX_PENDING_RESEARCH_DOCS} pending)`,
    });
    return;
  }

  const slotsAvailable = MAX_PENDING_RESEARCH_DOCS - pendingResearchCount;

  // Check existing blog post backlog (research also creates blog posts for high-relevance findings)
  const existingBlogs = await ctx.runQuery(
    internal.autopilot.documents.getDocumentsByTags,
    { organizationId, tags: ["market-insight"], status: "draft" }
  );
  let currentBlogCount = existingBlogs.length;

  // Batch dedup check — single query instead of N individual queries
  const dedupResults = await ctx.runQuery(
    internal.autopilot.dedup.findSimilarGrowthItems,
    { organizationId, titles: findings.map((f) => f.topic) }
  );
  const existingTopics = new Set(
    dedupResults.filter((r) => r.existingId !== null).map((r) => r.title)
  );

  let saved = 0;
  for (const finding of findings) {
    if (saved >= slotsAvailable) {
      break;
    }
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
    saved++;

    if (
      finding.relevance === "high" &&
      currentBlogCount < MAX_PENDING_BLOG_POSTS
    ) {
      await ctx.runMutation(internal.autopilot.documents.createDocument, {
        organizationId,
        type: "blog_post",
        title: `Market Insight: ${finding.topic}`,
        content: `${finding.summary}\n\nOpportunity: ${finding.opportunity}`,
        status: "draft",
        sourceAgent: "growth",
        tags: ["market-insight"],
      });
      currentBlogCount++;
    }
  }
};
