"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { action } from "../_generated/server";
import { requireAuthUser } from "../shared/access";
import { MAX_DESCRIPTION_LENGTH } from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import { RELEASE_ASSISTANT_MODEL } from "./ai/models";
import {
  buildFeedbackMatchPrompt,
  buildReleaseTitlePrompt,
} from "./ai/prompts";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MAX_TITLE_OUTPUT_TOKENS = 100;
const MAX_MATCH_OUTPUT_TOKENS = 4000;
const JSON_OBJECT_REGEX = /\{[\s\S]*\}/;

const confidenceValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

const matchResponseSchema = z.object({
  matches: z.array(
    z.object({
      confidence: z.enum(["high", "medium", "low"]),
      feedbackId: z.string(),
      reason: z.string(),
    })
  ),
});

type FeedbackMatches = z.infer<typeof matchResponseSchema>;

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
      model: openrouter(RELEASE_ASSISTANT_MODEL),
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
  handler: async (ctx, args): Promise<FeedbackMatches> => {
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

    const result = await generateText({
      maxOutputTokens: MAX_MATCH_OUTPUT_TOKENS,
      model: openrouter(RELEASE_ASSISTANT_MODEL),
      prompt: buildFeedbackMatchPrompt({
        commits: candidates.commits,
        description: args.description,
        feedbackItems: candidates.feedbackItems.map((feedback) => ({
          description: feedback.description,
          id: feedback._id,
          status: feedback.status,
          title: feedback.title,
        })),
      }),
    });

    const jsonMatch = result.text.match(JSON_OBJECT_REGEX);
    if (!jsonMatch) {
      throw new Error("AI returned non-JSON response");
    }
    const parsed = matchResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) {
      throw new Error("AI returned invalid match format");
    }

    const candidateIds = new Set<string>(
      candidates.feedbackItems.map((feedback) => feedback._id)
    );
    return {
      matches: parsed.data.matches.filter((match) =>
        candidateIds.has(match.feedbackId)
      ),
    };
  },
  returns: v.object({
    matches: v.array(
      v.object({
        confidence: confidenceValidator,
        feedbackId: v.string(),
        reason: v.string(),
      })
    ),
  }),
});
