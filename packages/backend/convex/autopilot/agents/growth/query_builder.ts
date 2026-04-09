/**
 * Growth query builder — generates targeted search queries from product context.
 *
 * Uses LLM to construct competitor-aware, platform-specific queries.
 * Produces 6-8 queries across different intent categories.
 */

import { z } from "zod";
import { FAST_MODELS } from "../models";
import { generateObjectWithFallback } from "../shared_generation";
import type { SearchQuery } from "../shared_search";

// ============================================
// SCHEMA
// ============================================

const searchQuerySchema = z.object({
  queries: z.array(
    z.object({
      query: z
        .string()
        .describe("Short search query (3-8 words, natural language)"),
      platform: z
        .enum(["reddit", "hackernews", "twitter", "linkedin", "general"])
        .describe("Target platform"),
      intent: z
        .enum([
          "problem_search",
          "competitor_alternative",
          "pain_point",
          "recommendation_request",
        ])
        .describe("What kind of discussion we're looking for"),
    })
  ),
});

// ============================================
// QUERY CONSTRUCTION
// ============================================

const QUERY_BUILDER_SYSTEM =
  "You are a growth strategist generating search queries to find community discussions where a product can add organic value. Generate SHORT, SPECIFIC queries that match how real people write on each platform.";

const buildQueryPrompt = (
  productName: string,
  productDescription: string,
  competitors: string[],
  previouslyFoundUrls: string[]
): string => {
  const competitorList =
    competitors.length > 0
      ? competitors.join(", ")
      : "(no known competitors yet)";

  const dedupeNote =
    previouslyFoundUrls.length > 0
      ? `\nAVOID finding these already-discovered URLs:\n${previouslyFoundUrls.slice(0, 10).join("\n")}\nGenerate DIFFERENT queries than last time — explore new angles.`
      : "";

  return `Generate 6-8 targeted search queries for ${productName}.

PRODUCT: ${productDescription}
COMPETITORS: ${competitorList}
${dedupeNote}

QUERY TYPES TO GENERATE:
1. PROBLEM SEARCHES (2-3 queries):
   People asking about the exact problem we solve.
   Example: "free screen recorder mac no watermark"

2. COMPETITOR ALTERNATIVES (1-2 queries):
   People looking for alternatives to our competitors.
   Example: "Screen Studio alternative free" or "tired of Loom limitations"

3. PAIN POINT THREADS (1-2 queries):
   People frustrated with existing solutions.
   Example: "OBS too complex screen recording mac"

4. RECOMMENDATION REQUESTS (1-2 queries):
   "What do you use for X?" threads.
   Example: "what screen recorder do you use for tutorials mac"

RULES:
- Keep queries short (3-8 words) — search engines work better with concise queries
- Use natural language people actually type, not marketing speak
- Include platform context (Reddit users write differently than LinkedIn)
- Do NOT include the product name "${productName}" in queries
- Do NOT search for tech stack topics (React, TypeScript, databases, etc.)
- Vary platforms across queries — don't put all on Reddit`;
};

/**
 * Generate targeted search queries from product context + competitors.
 * Returns 6-8 queries across platforms and intent categories.
 */
export const buildGrowthQueries = async (
  productName: string,
  productDescription: string,
  competitors: string[],
  previouslyFoundUrls: string[]
): Promise<SearchQuery[]> => {
  const result = await generateObjectWithFallback({
    models: FAST_MODELS,
    schema: searchQuerySchema,
    prompt: buildQueryPrompt(
      productName,
      productDescription,
      competitors,
      previouslyFoundUrls
    ),
    systemPrompt: QUERY_BUILDER_SYSTEM,
  });

  return result.queries.map((q) => ({
    query: q.query,
    platform: q.platform,
    intent: q.intent,
  }));
};
