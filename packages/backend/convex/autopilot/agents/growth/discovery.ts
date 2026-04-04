/**
 * Growth discovery — finds relevant online threads for content distribution.
 */

import { z } from "zod";
import { MODELS } from "../models";
import { generateObjectWithFallback } from "../shared";

export const GROWTH_SEARCH_MODELS = [
  MODELS.SEARCH_FREE,
  MODELS.SEARCH_PAID,
] as const;
export const GROWTH_CONTENT_MODELS = [MODELS.FREE, MODELS.FAST] as const;

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
// DISCOVERY
// ============================================

export const discoverThreads = async (
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
