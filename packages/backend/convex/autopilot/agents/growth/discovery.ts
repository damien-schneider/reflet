/**
 * Growth discovery — 4-stage pipeline for finding and qualifying community threads.
 *
 * Stage 1: QUERY CONSTRUCTION — LLM generates targeted search queries
 * Stage 2: MULTI-SEARCH — Exa.ai (preferred) or web search (fallback)
 * Stage 3: CONTENT ENRICHMENT — fetch actual thread content
 * Stage 4: RELEVANCE SCORING — LLM validates with real content
 */

import { z } from "zod";
import { FAST_MODELS } from "../models";
import { generateObjectWithFallback } from "../shared_generation";
import { executeSearchQueries, getSearchCostUsd } from "../shared_search";
import { enrichThreads } from "./content_enricher";
import { buildGrowthQueries } from "./query_builder";
import { type ScoredThread, scoreThreadRelevance } from "./relevance_scorer";

export const GROWTH_CONTENT_MODELS = FAST_MODELS;

// Re-export ScoredThread as the primary thread type for downstream consumers
export type { ScoredThread } from "./relevance_scorer";

// ============================================
// SCHEMAS
// ============================================

export const enrichedThreadSchema = z.object({
  threads: z.array(
    z.object({
      platform: z.enum(["reddit", "hackernews", "linkedin", "twitter"]),
      url: z.string(),
      title: z.string(),
      community: z.string().describe("e.g. r/macapps, Hacker News"),
      originalPostContent: z.string().describe("The actual post text"),
      topComments: z.array(z.string()).describe("Top 3-5 comments for context"),
      authorName: z.string(),
      relevanceScore: z.number().min(0).max(100),
      relevanceReason: z.string(),
      suggestedAngle: z.string(),
      postAge: z.string(),
      commentCount: z.number(),
      isStale: z.boolean(),
      engagementLevel: z.enum(["high", "medium", "low"]),
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
// GAP ASSESSMENT SCHEMA
// ============================================

export const gapAssessmentSchema = z.object({
  gaps: z.array(
    z.object({
      topic: z
        .string()
        .describe("What needs investigating — a question, not a statement"),
      reasoning: z
        .string()
        .describe("Why this gap matters for the product's growth"),
      suggestedSearchTerms: z
        .array(z.string())
        .describe("Specific search queries to run next time"),
    })
  ),
  marketUnderstandingScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "How complete is our understanding of the market right now (0 = blind, 100 = fully informed)"
    ),
});

// ============================================
// PUBLIC API
// ============================================

export interface DiscoveryResult {
  queriesRun: number;
  searchCostUsd: number;
  threads: ScoredThread[];
  threadsDiscovered: number;
  threadsEnriched: number;
  threadsQualified: number;
}

/**
 * Discover and qualify community threads via the 4-stage pipeline:
 *   1. Query construction (LLM generates targeted queries)
 *   2. Multi-search execution (Exa or web search)
 *   3. Content enrichment (fetch actual thread content)
 *   4. Relevance scoring (LLM validates with real content)
 */
export const discoverThreads = async (
  productName: string,
  productDescription: string,
  competitors: string[] = [],
  previouslyFoundUrls: string[] = []
): Promise<DiscoveryResult> => {
  // Stage 1: Generate targeted search queries
  const queries = await buildGrowthQueries(
    productName,
    productDescription,
    competitors,
    previouslyFoundUrls
  );

  // Stage 2: Execute search (Exa preferred, web search fallback)
  const discovered = await executeSearchQueries(queries);

  if (discovered.length === 0) {
    return {
      threads: [],
      searchCostUsd: getSearchCostUsd(),
      queriesRun: queries.length,
      threadsDiscovered: 0,
      threadsEnriched: 0,
      threadsQualified: 0,
    };
  }

  // Stage 3: Enrich with actual content (Reddit .json, HN API, Exa)
  const enriched = await enrichThreads(discovered);

  // Stage 4: LLM-based relevance scoring with real content
  const scored = await scoreThreadRelevance(
    enriched,
    productName,
    productDescription
  );

  return {
    threads: scored,
    searchCostUsd: getSearchCostUsd(),
    queriesRun: queries.length,
    threadsDiscovered: discovered.length,
    threadsEnriched: enriched.length,
    threadsQualified: scored.length,
  };
};

/**
 * Assess gaps in current market understanding.
 * Called after every Growth run to create self-driven follow-up work.
 */
export const assessMarketGaps = async (
  productName: string,
  productDescription: string,
  existingResearchSummary: string,
  competitorNames: string[]
): Promise<z.infer<typeof gapAssessmentSchema>> => {
  const systemPrompt = `You are a growth strategist assessing what you DON'T know about the market.
Your job is intellectual honesty — identify blind spots, not confirm what you already know.
Think like a curious researcher, not a satisfied marketer.

IMPORTANT: Stay anchored to the product's specific domain. Only suggest investigating
competitors and trends that are directly relevant to the product's user problem.
Do NOT suggest investigating frameworks, dev tools, or infrastructure unless the
product itself is in that category.`;

  const prompt = `Assess gaps in our market understanding for ${productName}.

PRODUCT DEFINITION:
${productDescription}

WHAT WE ALREADY KNOW:
${existingResearchSummary || "(very little — we're just getting started)"}

COMPETITORS WE CURRENTLY TRACK:
${competitorNames.length > 0 ? competitorNames.join(", ") : "(none yet)"}
${competitorNames.length > 0 ? "\nFirst, review the list above — are any of these NOT actually competitors (e.g. they don't solve the same user problem)? If so, note that in your gaps.\n" : ""}

Identify 2-5 specific gaps:
- What community conversations about our product's domain might we be missing?
- What DIRECT competitors (same user problem, same audience) might we not know about?
- What user pain points haven't we explored?
- What market trends could affect the product's domain?

Be specific. "We should research more" is useless. "Are there Slack communities discussing X?" is useful.
Only suggest gaps relevant to the product domain described above.

Rate our overall market understanding from 0 (blind) to 100 (fully informed).`;

  return await generateObjectWithFallback({
    models: GROWTH_CONTENT_MODELS,
    schema: gapAssessmentSchema,
    prompt,
    systemPrompt,
  });
};
