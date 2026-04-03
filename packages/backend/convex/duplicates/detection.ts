"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

const SIMILARITY_THRESHOLD = 0.7;
const MAX_CANDIDATES = 10;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const DUPLICATE_CHECK_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "upstage/solar-pro-3:free",
] as const;

const duplicateCheckSchema = z.object({
  duplicates: z.array(
    z.object({
      feedbackId: z.string(),
      similarityScore: z
        .number()
        .min(0)
        .max(1)
        .describe("How similar this is to the new feedback (0-1)"),
      reasoning: z.string().describe("Brief explanation of the similarity"),
    })
  ),
});

export const findSimilarFeedback = internalAction({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.runQuery(
      internal.duplicates.queries.getFeedbackForComparison,
      { feedbackId: args.feedbackId }
    );

    if (!feedback) {
      return;
    }

    const candidates = await ctx.runQuery(
      internal.duplicates.queries.searchSimilarByTitle,
      {
        organizationId: feedback.organizationId,
        title: feedback.title,
        excludeId: args.feedbackId,
        limit: MAX_CANDIDATES,
      }
    );

    if (candidates.length === 0) {
      return;
    }

    const candidateDescriptions = candidates
      .map(
        (c: { _id: string; title: string; description: string }, i: number) =>
          `[${i}] ID: ${c._id}\nTitle: ${c.title}\nDescription: ${c.description.slice(0, 200)}`
      )
      .join("\n\n");

    let result: z.infer<typeof duplicateCheckSchema> | undefined;

    for (const model of DUPLICATE_CHECK_MODELS) {
      try {
        const response = await generateObject({
          model: openrouter(model),
          schema: duplicateCheckSchema,
          prompt: `Compare this new feedback with the existing items below. Return items that are genuine duplicates or very similar (score > ${SIMILARITY_THRESHOLD}).

NEW FEEDBACK:
Title: ${feedback.title}
Description: ${feedback.description.slice(0, 300)}

EXISTING ITEMS:
${candidateDescriptions}

Only include items that discuss the same problem or feature request. Score 0.9+ for exact duplicates, 0.7-0.9 for very similar.`,
        });
        result = response.object;
        break;
      } catch {
        // Retry with next model on transient AI generation failures
      }
    }

    if (!result) {
      return;
    }

    for (const dup of result.duplicates) {
      if (dup.similarityScore >= SIMILARITY_THRESHOLD) {
        await ctx.runMutation(internal.duplicates.queries.createDuplicatePair, {
          organizationId: feedback.organizationId,
          feedbackIdA: args.feedbackId,
          feedbackIdB: dup.feedbackId as Id<"feedback">,
          similarityScore: dup.similarityScore,
        });
      }
    }
  },
});
