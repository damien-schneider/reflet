"use node";

import { experimental_evaluate as evaluate, generateText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { action } from "../_generated/server";
import { jev } from "../ai/evaluation";
import { textModel } from "../ai/openrouter";
import { requireAuthUser } from "../shared/access";
import { MAX_DESCRIPTION_LENGTH } from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import { buildReleaseTitlePrompt, formatCommitLine } from "./ai/prompts";

const MAX_TITLE_OUTPUT_TOKENS = 100;
const MAX_FEEDBACK_DESCRIPTION_LENGTH = 200;
const HIGH_CONFIDENCE_PROBABILITY = 0.85;
const MEDIUM_CONFIDENCE_PROBABILITY = 0.65;
const LOW_CONFIDENCE_PROBABILITY = 0.5;

const confidenceValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

interface FeedbackMatch {
  confidence: "high" | "medium" | "low";
  feedbackId: Id<"feedback">;
}

async function consumeReleaseAiGeneration(
  ctx: ActionCtx,
  releaseId: Id<"releases">
): Promise<void> {
  const user = await requireAuthUser(ctx);
  const organizationId = await ctx.runQuery(
    internal.changelog.ai_matching_helpers.getReleaseOrganizationId,
    { releaseId }
  );
  if (!organizationId) {
    throw new Error("Release not found");
  }
  await ctx.runMutation(internal.ai.usage_gate.consumeAiGenerationForUser, {
    organizationId,
    userId: user._id,
  });
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("AI service not configured");
  }
}

export const generateReleaseTitle = action({
  args: {
    description: v.string(),
    releaseId: v.id("releases"),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );
    await consumeReleaseAiGeneration(ctx, args.releaseId);
    const result = await generateText({
      maxOutputTokens: MAX_TITLE_OUTPUT_TOKENS,
      model: textModel,
      prompt: buildReleaseTitlePrompt(args),
    });
    return result.text.trim();
  },
  returns: v.string(),
});

export const matchReleaseFeedback = action({
  args: {
    description: v.string(),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args): Promise<{ matches: FeedbackMatch[] }> => {
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );
    await consumeReleaseAiGeneration(ctx, args.releaseId);
    const candidates = await ctx.runQuery(
      internal.changelog.ai_matching_helpers.getReleaseAndFeedback,
      { releaseId: args.releaseId }
    );
    if (!candidates || candidates.feedbackItems.length === 0) {
      return { matches: [] };
    }

    const { answers } = await evaluate({
      model: jev,
      questions: Object.fromEntries(
        candidates.feedbackItems.map((feedback) => [
          feedback._id,
          {
            instructions: `Does this release ship what feedback "${feedback._id}" in the state asks for?`,
            type: "boolean" as const,
          },
        ])
      ),
      state: JSON.stringify({
        feedback: candidates.feedbackItems.map((feedback) => ({
          description: feedback.description.slice(
            0,
            MAX_FEEDBACK_DESCRIPTION_LENGTH
          ),
          id: feedback._id,
          title: feedback.title,
        })),
        release: {
          commits: candidates.commits.map(formatCommitLine),
          description: args.description,
          title: candidates.title,
        },
      }),
    });

    const scoredFeedback = candidates.feedbackItems.map((feedback) => {
      const answer = answers[feedback._id];
      if (answer?.type !== "boolean") {
        throw new Error(
          `Release matching returned no verdict for feedback ${feedback._id}`
        );
      }
      return { feedbackId: feedback._id, probability: answer.probability };
    });

    return {
      matches: scoredFeedback
        .filter(({ probability }) => probability >= LOW_CONFIDENCE_PROBABILITY)
        .sort((a, b) => b.probability - a.probability)
        .map(({ feedbackId, probability }): FeedbackMatch => {
          if (probability >= HIGH_CONFIDENCE_PROBABILITY) {
            return { confidence: "high", feedbackId };
          }
          if (probability >= MEDIUM_CONFIDENCE_PROBABILITY) {
            return { confidence: "medium", feedbackId };
          }
          return { confidence: "low", feedbackId };
        }),
    };
  },
  returns: v.object({
    matches: v.array(
      v.object({
        confidence: confidenceValidator,
        feedbackId: v.id("feedback"),
      })
    ),
  }),
});
