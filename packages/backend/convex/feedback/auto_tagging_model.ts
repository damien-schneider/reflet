import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

const PRIORITY_LEVELS = ["critical", "high", "medium", "low", "none"] as const;

const COMPLEXITY_LEVELS = [
  "trivial",
  "simple",
  "moderate",
  "complex",
  "very_complex",
] as const;

export const autoTaggingResponseSchema = z.object({
  complexity: z
    .enum(COMPLEXITY_LEVELS)
    .describe(
      "Implementation complexity: trivial (<1h), simple (1-4h), moderate (1-2 days), complex (3-5 days), very_complex (1+ weeks)"
    ),
  complexityReasoning: z
    .string()
    .describe("Brief explanation of the complexity assessment"),
  priority: z
    .enum(PRIORITY_LEVELS)
    .describe(
      "Priority level: critical (blocking/urgent), high (important/impactful), medium (standard), low (nice-to-have), none (informational only)"
    ),
  priorityReasoning: z
    .string()
    .describe("Brief explanation of why this priority level was assigned"),
  reasoning: z
    .string()
    .describe("Brief explanation of why these tags were selected"),
  selectedTagIds: z
    .array(z.string())
    .describe(
      "Array of tag IDs from the provided list that match the feedback"
    ),
  timeEstimate: z
    .string()
    .describe(
      "Estimated implementation time as a human-readable range, e.g. '2-4 hours', '1-2 days', '1-2 weeks'"
    ),
});

export type AutoTaggingResponse = z.infer<typeof autoTaggingResponseSchema>;

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const AUTO_TAGGING_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "upstage/solar-pro-3:free",
  "z-ai/glm-4.7-flash",
] as const;
