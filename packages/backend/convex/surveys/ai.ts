import { ConvexError, v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { generateStructured } from "../intelligence/structured_output";
import { requireAuthUser } from "../shared/access";
import { normalizeGeneratedDraft } from "./lib/ai_draft_normalize";
import { SURVEY_DRAFT_SYSTEM_PROMPT } from "./lib/ai_draft_prompt";
import {
  type GeneratedDraft,
  generatedDraftSchema,
  type SurveyDraft,
  surveyDraftValidator,
} from "./lib/ai_draft_schema";

const SURVEY_DRAFT_MODEL = "anthropic/claude-sonnet-4";
const MAX_PROMPT_CHARS = 2000;

const SURVEY_DRAFT_SYSTEM_PROMPT_WITH_FORMAT = `${SURVEY_DRAFT_SYSTEM_PROMPT}

Respond with ONLY a JSON object, no prose or code fences, matching this JSON Schema:
${JSON.stringify(z.toJSONSchema(generatedDraftSchema))}`;

const generateSurveyObject = async (
  request: string
): Promise<GeneratedDraft> => {
  try {
    return await generateStructured({
      model: SURVEY_DRAFT_MODEL,
      prompt: `Draft a survey for this request:\n"""\n${request}\n"""`,
      schema: generatedDraftSchema,
      system: SURVEY_DRAFT_SYSTEM_PROMPT_WITH_FORMAT,
    });
  } catch (error) {
    console.error(
      `[surveys.ai] Draft generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw new ConvexError(
      "The AI couldn’t draft a survey right now. Try again in a moment."
    );
  }
};

export const generateDraft = action({
  args: { organizationId: v.id("organizations"), prompt: v.string() },
  handler: async (ctx, args): Promise<SurveyDraft> => {
    const user = await requireAuthUser(ctx);
    const request = args.prompt.trim();
    if (request === "") {
      throw new ConvexError("Describe what you want to learn from your users.");
    }
    if (request.length > MAX_PROMPT_CHARS) {
      throw new ConvexError(
        `Keep the description under ${MAX_PROMPT_CHARS} characters.`
      );
    }
    await ctx.runMutation(internal.ai.usage_gate.consumeAiGenerationForUser, {
      organizationId: args.organizationId,
      userId: user._id,
    });
    return normalizeGeneratedDraft(await generateSurveyObject(request));
  },
  returns: surveyDraftValidator,
});
