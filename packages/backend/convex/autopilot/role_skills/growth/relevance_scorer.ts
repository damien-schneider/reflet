/**
 * Relevance scorer — LLM-based relevance validation using actual thread content.
 *
 * Reads enriched thread content + product definition → scores genuine relevance.
 * Drops threads below threshold (70/100) and marks stale threads (>30 days).
 */

import { z } from "zod";
import { FAST_MODELS } from "../models";
import { generateObjectWithFallback } from "../shared_generation";
import type { EnrichedThread } from "./content_enricher";

// ============================================
// TYPES
// ============================================

export interface ScoredThread extends EnrichedThread {
  engagementLevel: "high" | "medium" | "low";
  isStale: boolean;
  relevanceReason: string;
  relevanceScore: number;
  suggestedAngle: string;
}

// ============================================
// SCHEMA
// ============================================

const scoredThreadsSchema = z.object({
  scoredThreads: z.array(
    z.object({
      url: z.string(),
      relevanceScore: z.number().min(0).max(100),
      relevanceReason: z.string(),
      suggestedAngle: z.string(),
      engagementLevel: z.enum(["high", "medium", "low"]),
    })
  ),
});

// ============================================
// CONSTANTS
// ============================================

const RELEVANCE_THRESHOLD = 70;
const STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_THREADS_PER_BATCH = 8;

// ============================================
// SCORING
// ============================================

const buildScoringPrompt = (
  threads: EnrichedThread[],
  productName: string,
  productDescription: string
): string => {
  const threadBlocks = threads
    .map(
      (t, i) => `--- THREAD ${i + 1} ---
URL: ${t.url}
Platform: ${t.platform} (${t.community})
Title: ${t.title}
Author: ${t.authorName}
Age: ${t.postAge} | Comments: ${t.commentCount}

POST CONTENT:
${t.originalPostContent.slice(0, 1500)}

TOP COMMENTS:
${t.topComments.length > 0 ? t.topComments.map((c) => `• ${c.slice(0, 300)}`).join("\n") : "(no comments)"}`
    )
    .join("\n\n");

  return `Score these community threads for ${productName}.

PRODUCT: ${productDescription}

${threadBlocks}

For EACH thread, read the ACTUAL CONTENT (not just the title) and evaluate:

1. RELEVANCE (0-100): Does this person's problem genuinely relate to what our product does?
   - 90-100: They are literally asking for what we build
   - 70-89: Strong overlap, our product would clearly help
   - 50-69: Tangential — related topic but not a direct fit
   - 0-49: Not relevant — drop it

2. ENGAGEMENT OPPORTUNITY: Can we add genuine value?
   - Is the thread still accepting replies?
   - Are there already great answers? (if well-solved, don't pile on)
   - Would mentioning our product feel natural or forced?

3. ENGAGEMENT LEVEL: Based on comment count and activity
   - high: 20+ comments, active discussion
   - medium: 5-20 comments
   - low: <5 comments

CRITICAL: Read the actual post content and comments. A title like "Free screen recorder" could be about anything — the post body tells the truth.

Return a score for each thread URL.`;
};

/**
 * Score enriched threads for relevance using LLM.
 * Drops threads below the 70/100 threshold and marks stale threads.
 */
export const scoreThreadRelevance = async (
  threads: EnrichedThread[],
  productName: string,
  productDescription: string
): Promise<ScoredThread[]> => {
  if (threads.length === 0) {
    return [];
  }

  // Process in batches to avoid prompt size limits
  const batches = splitIntoBatches(threads, MAX_THREADS_PER_BATCH);
  const allScored: ScoredThread[] = [];

  for (const batch of batches) {
    const scored = await scoreBatch(batch, productName, productDescription);
    allScored.push(...scored);
  }

  return allScored.filter((t) => t.relevanceScore >= RELEVANCE_THRESHOLD);
};

const scoreBatch = async (
  threads: EnrichedThread[],
  productName: string,
  productDescription: string
): Promise<ScoredThread[]> => {
  const result = await generateObjectWithFallback({
    models: FAST_MODELS,
    schema: scoredThreadsSchema,
    prompt: buildScoringPrompt(threads, productName, productDescription),
    systemPrompt:
      "You are evaluating community threads for genuine relevance to a product. Score based on ACTUAL thread content, not just titles.",
  });

  const scoreMap = new Map(result.scoredThreads.map((s) => [s.url, s]));

  return threads
    .filter((t) => scoreMap.has(t.url))
    .map((thread) => {
      const score = scoreMap.get(thread.url);
      if (!score) {
        return null;
      }

      const isStale = computeIsStale(thread);

      return {
        ...thread,
        relevanceScore: score.relevanceScore,
        relevanceReason: score.relevanceReason,
        suggestedAngle: score.suggestedAngle,
        isStale,
        engagementLevel: score.engagementLevel,
      };
    })
    .filter((t): t is ScoredThread => t !== null);
};

// ============================================
// HELPERS
// ============================================

const computeIsStale = (thread: EnrichedThread): boolean => {
  if (thread.publishedDate) {
    const age = Date.now() - new Date(thread.publishedDate).getTime();
    return age > STALE_THRESHOLD_MS;
  }
  // Check postAge string for staleness heuristic
  const ageStr = thread.postAge.toLowerCase();
  return ageStr.includes("month") || ageStr.includes("year");
};

const splitIntoBatches = <T>(items: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
};
