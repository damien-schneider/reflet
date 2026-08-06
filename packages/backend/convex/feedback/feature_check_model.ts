import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const FEATURE_CHECK_MODEL = "anthropic/claude-sonnet-4";

// Zod schema for search term extraction
export const searchTermsSchema = z.object({
  featureDescription: z
    .string()
    .describe("Concise 1-2 sentence summary of the feature being requested"),
  relevantPaths: z
    .array(z.string())
    .describe(
      "Likely file path patterns where this feature might be implemented (e.g. 'src/features/auth', 'components/checkout')"
    ),
  searchQueries: z
    .array(z.string())
    .min(3)
    .max(7)
    .describe(
      "GitHub code search queries to find this feature (function names, component names, API endpoints, etc.)"
    ),
});

// Zod schema for feature check analysis result
export const featureCheckResultSchema = z.object({
  confidence: z.number().min(0).max(1).describe("Confidence score from 0 to 1"),
  evidence: z
    .array(
      z.object({
        filePath: z.string(),
        relevance: z.string().describe("Why this file is relevant"),
        snippet: z.string().optional(),
      })
    )
    .max(5),
  result: z.enum([
    "implemented",
    "partially_implemented",
    "not_implemented",
    "inconclusive",
  ]),
  summary: z
    .string()
    .describe("Human-readable explanation of the finding (2-4 sentences)"),
});

export const MAX_FILES_TO_FETCH = 10;
export const MAX_SEARCH_RESULTS = 15;
