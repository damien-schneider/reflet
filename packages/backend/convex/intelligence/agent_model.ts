import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { generateStructuredWithFallback } from "./structured_output";

// OpenRouter provider setup
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model fallback chains for intelligence — try free first, fall back to paid
export const SEARCH_MODELS = [
  "qwen/qwen3.6-plus-preview:free:online",
  "openai/gpt-5.4-mini:online",
] as const;

export const EXTRACTION_MODELS = [
  "qwen/qwen3.6-plus-preview:free",
  "openai/gpt-5.4-mini",
] as const;

/**
 * Try generateText with each model in order until one succeeds.
 */
export const generateTextWithFallback = async (
  models: readonly string[],
  options: { system: string; prompt: string }
) => {
  let lastError: unknown;
  for (const modelId of models) {
    try {
      const result = await generateText({
        model: openrouter(modelId),
        prompt: options.prompt,
        system: options.system,
      });
      return result;
    } catch (error) {
      console.warn(
        `[intelligence] Model ${modelId} failed: ${error instanceof Error ? error.message : error}`
      );
      lastError = error;
    }
  }
  throw lastError;
};

// Minimum relevance score to store a signal
export const MIN_RELEVANCE_SCORE = 0.4;

// Maximum findings per query to keep costs manageable
export const MAX_FINDINGS_PER_QUERY = 10;

// Shared output schema for AI-extracted signals
export const signalOutputSchema = z.object({
  findings: z.array(
    z.object({
      content: z.string().describe("Summary of the finding"),
      relevanceScore: z.number().min(0).max(1),
      sentiment: z.enum(["positive", "negative", "neutral"]),
      signalType: z.enum([
        "pain_point",
        "feature_request",
        "competitor_update",
        "pricing_change",
        "market_trend",
        "feature_gap",
      ]),
      source: z
        .enum(["reddit", "hackernews", "web"])
        .describe("Best guess of where this info came from"),
      title: z.string(),
      url: z.string().optional().describe("Source URL if found"),
    })
  ),
});

export type SignalOutput = z.infer<typeof signalOutputSchema>;

/**
 * Extract structured findings from raw search text.
 */
export const extractFindings = async (
  rawText: string,
  context: string
): Promise<SignalOutput> =>
  generateStructuredWithFallback({
    models: EXTRACTION_MODELS,
    prompt: `${context}\n\n${rawText}`,
    schema: signalOutputSchema,
    system: `You are a data extraction specialist. Extract structured intelligence findings from the provided web search results.

For each finding, classify it as one of: pain_point, feature_request, competitor_update, pricing_change, market_trend, feature_gap.
Rate relevance from 0-1 and sentiment as positive/negative/neutral.
Only include findings that are clearly present in the search results. Do not fabricate information.

Respond with ONLY valid JSON matching this exact format:
{
  "findings": [
    {
      "title": "string",
      "content": "Summary of the finding",
      "url": "Source URL if found (optional)",
      "signalType": "pain_point|feature_request|competitor_update|pricing_change|market_trend|feature_gap",
      "relevanceScore": 0.0-1.0,
      "sentiment": "positive|negative|neutral",
      "source": "reddit|hackernews|web"
    }
  ]
}`,
  });
