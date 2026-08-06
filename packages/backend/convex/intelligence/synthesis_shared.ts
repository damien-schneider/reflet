import { z } from "zod";

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const SYNTHESIS_MODEL = "anthropic/claude-sonnet-4";

export const synthesisSchema = z.object({
  insights: z.array(
    z.object({
      priority: z.enum(["critical", "high", "medium", "low"]),
      reasoning: z.string(),
      relatedSignalIndices: z
        .array(z.number())
        .describe("Indices into the signals array"),
      suggestedFeedbackDescription: z.string().optional(),
      suggestedFeedbackTitle: z.string().optional(),
      summary: z.string(),
      title: z.string(),
      type: z.enum([
        "feature_suggestion",
        "competitive_alert",
        "market_opportunity",
        "risk_warning",
      ]),
    })
  ),
});

export const battlecardSchema = z.object({
  objectionHandling: z.array(
    z.object({ objection: z.string(), rebuttal: z.string() })
  ),
  overview: z.string(),
  strengths: z.array(z.string()),
  talkTracks: z.array(z.object({ response: z.string(), scenario: z.string() })),
  weaknesses: z.array(z.string()),
});

/**
 * Get signals since a given timestamp for an org
 */

export type SynthesisInsights = z.infer<typeof synthesisSchema>["insights"];
