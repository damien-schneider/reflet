"use node";

import { experimental_evaluate as evaluate } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { jev } from "../ai/evaluation";

const SIMILARITY_THRESHOLD = 0.7;
const MAX_CANDIDATES = 10;
const MAX_CANDIDATE_DESCRIPTION_LENGTH = 200;

export const findSimilarFeedback = internalAction({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    if (!process.env.OPENROUTER_API_KEY) {
      return;
    }

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
        excludeId: args.feedbackId,
        limit: MAX_CANDIDATES,
        organizationId: feedback.organizationId,
        title: feedback.title,
      }
    );

    if (candidates.length === 0) {
      return;
    }

    const { answers } = await evaluate({
      model: jev,
      questions: Object.fromEntries(
        candidates.map((_candidate, index) => [
          `candidate_${index}`,
          {
            instructions: `Is existing feedback ${index} asking for the same requested change as the new feedback, not merely a related topic?`,
            type: "boolean" as const,
          },
        ])
      ),
      state: JSON.stringify({
        candidates: candidates.map((candidate, index) => ({
          description: candidate.description.slice(
            0,
            MAX_CANDIDATE_DESCRIPTION_LENGTH
          ),
          index,
          title: candidate.title,
        })),
        newFeedback: {
          description: feedback.description,
          title: feedback.title,
        },
      }),
    });

    for (const [index, candidate] of candidates.entries()) {
      const answer = answers[`candidate_${index}`];
      if (answer?.type !== "boolean") {
        throw new Error(
          `Duplicate evaluation returned no verdict for candidate ${index}`
        );
      }
      if (answer.probability >= SIMILARITY_THRESHOLD) {
        await ctx.runMutation(internal.duplicates.queries.createDuplicatePair, {
          feedbackIdA: args.feedbackId,
          feedbackIdB: candidate._id,
          organizationId: feedback.organizationId,
          similarityScore: answer.probability,
        });
      }
    }
  },
});
