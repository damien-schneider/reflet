/**
 * Growth discovery — finds relevant online threads using real web search.
 *
 * Two-step pipeline:
 *   1. searchCommunities — real web search via openrouter:web_search server tool
 *   2. structureDiscoveries — LLM structures raw results into typed schema
 *   3. validateDiscoveredUrls — HTTP HEAD to confirm URLs are alive
 */

import { z } from "zod";
import { AGENT_MODELS, WEB_SEARCH_MODELS } from "../models";
import {
  generateObjectWithFallback,
  generateTextWithWebSearch,
  validateUrls,
} from "../shared";

export const GROWTH_SEARCH_MODELS = WEB_SEARCH_MODELS;
export const GROWTH_CONTENT_MODELS = AGENT_MODELS;

// ============================================
// SCHEMAS
// ============================================

export const threadDiscoverySchema = z.object({
  threads: z.array(
    z.object({
      platform: z.enum(["reddit", "hackernews", "linkedin", "twitter"]),
      url: z.string().describe("URL of the thread"),
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
// COMMUNITY SEARCH DOMAINS
// ============================================

const COMMUNITY_DOMAINS = [
  "reddit.com",
  "news.ycombinator.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "indiehackers.com",
  "dev.to",
  "hashnode.com",
  "medium.com",
] as const;

// ============================================
// STEP 1: SEARCH COMMUNITIES (real web search)
// ============================================

const searchCommunities = async (
  productName: string,
  productDescription: string
): Promise<{
  text: string;
  citations: Array<{ url: string; title: string; content: string }>;
}> => {
  const systemPrompt = `You are a growth intelligence analyst. Search for recent online discussions where a product like this could provide value.

Focus on finding REAL, RECENT threads where:
- People ask about problems the product solves
- Competing products are discussed or compared
- People are looking for alternatives or recommendations

IMPORTANT: Search for discussions about the PROBLEM DOMAIN the product addresses,
not about the technologies it is built with. We want to find potential users and
market conversations, not developer discussions about frameworks.`;

  const prompt = `Find relevant community discussions for: ${productName}

Product: ${productName}
Description: ${productDescription}

Search for recent threads and posts where this product could naturally add value. Look for:
1. Questions about problems this product solves
2. "What tool do you use for X?" discussions about the problem domain
3. Competing product discussions or comparisons
4. People expressing frustration with existing solutions in this space

Return the most relevant discussions you find with context about each one.`;

  return await generateTextWithWebSearch({
    models: GROWTH_SEARCH_MODELS,
    prompt,
    systemPrompt,
    searchConfig: {
      max_results: 10,
      allowed_domains: [...COMMUNITY_DOMAINS],
    },
  });
};

// ============================================
// STEP 2: STRUCTURE DISCOVERIES
// ============================================

const structureDiscoveries = async (
  rawSearchText: string,
  citations: Array<{ url: string; title: string; content: string }>
): Promise<z.infer<typeof threadDiscoverySchema>> => {
  const citationsContext = citations
    .map((c) => `- [${c.title}](${c.url})\n  ${c.content}`)
    .join("\n\n");

  const systemPrompt = `You are structuring web search results into a clean format.
You MUST only use URLs that appear in the CITATIONS section below.
Do NOT invent or guess any URLs. If a finding has no matching citation URL, skip it.`;

  const prompt = `Structure these web search results into the thread discovery format.

RAW SEARCH OUTPUT:
${rawSearchText}

CITATIONS (only use URLs from this list):
${citationsContext || "(no citations returned)"}

For each relevant thread found, extract:
- platform: which platform (reddit, hackernews, linkedin, twitter)
- url: the EXACT URL from the citations above
- title: the thread/post title
- relevanceScore: 0-100 based on how relevant this is
- suggestedAngle: how the product could naturally engage

Only include threads with relevance score 50+. Maximum 10 threads.`;

  return await generateObjectWithFallback({
    models: GROWTH_CONTENT_MODELS,
    schema: threadDiscoverySchema,
    prompt,
    systemPrompt,
  });
};

// ============================================
// STEP 3: VALIDATE URLs
// ============================================

const validateDiscoveredUrls = async (
  threads: z.infer<typeof threadDiscoverySchema>["threads"]
): Promise<{
  validThreads: z.infer<typeof threadDiscoverySchema>["threads"];
  droppedUrls: Array<{ url: string; reason: string }>;
}> => {
  const urls = threads.map((t) => t.url);
  const validationMap = await validateUrls(urls);

  const validThreads: z.infer<typeof threadDiscoverySchema>["threads"] = [];
  const droppedUrls: Array<{ url: string; reason: string }> = [];

  for (const thread of threads) {
    const validation = validationMap.get(thread.url);
    if (validation?.valid) {
      validThreads.push(thread);
    } else {
      droppedUrls.push({
        url: thread.url,
        reason: validation?.reason ?? "unknown",
      });
    }
  }

  return { validThreads, droppedUrls };
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Discover real community threads via web search → structure → validate.
 */
export const discoverThreads = async (
  productName: string,
  productDescription: string
): Promise<z.infer<typeof threadDiscoverySchema>> => {
  // Step 1: Real web search
  const { text, citations } = await searchCommunities(
    productName,
    productDescription
  );

  // No citations found — return empty (no hallucination fallback)
  if (citations.length === 0) {
    return { threads: [] };
  }

  // Step 2: Structure into typed schema (only using real citation URLs)
  const structured = await structureDiscoveries(text, citations);

  // Step 3: Validate URLs are alive
  const { validThreads } = await validateDiscoveredUrls(structured.threads);

  return { threads: validThreads };
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
Think like a curious researcher, not a satisfied marketer.`;

  const prompt = `Assess gaps in our market understanding for ${productName}.

Product: ${productName}
Description: ${productDescription}

WHAT WE ALREADY KNOW:
${existingResearchSummary || "(very little — we're just getting started)"}

COMPETITORS WE TRACK:
${competitorNames.length > 0 ? competitorNames.join(", ") : "(none yet)"}

Identify 2-5 specific gaps:
- What community conversations might we be missing?
- What competitors might we not know about yet?
- What user pain points haven't we explored?
- What market trends could affect us that we haven't researched?

Be specific. "We should research more" is useless. "Are there Slack communities discussing X?" is useful.

Rate our overall market understanding from 0 (blind) to 100 (fully informed).`;

  return await generateObjectWithFallback({
    models: GROWTH_CONTENT_MODELS,
    schema: gapAssessmentSchema,
    prompt,
    systemPrompt,
  });
};
