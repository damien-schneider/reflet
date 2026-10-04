import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { insertQuestion, insertSurvey } from "./survey_seed";

export const PROMOTER_ENDING = { id: "promoter", title: "Thanks, fan!" };
export const DETRACTOR_ENDING = { id: "detractor", title: "We'll fix it" };
const LOW_SCORE = 7;

/**
 * Score below 7 → "What should we fix?" → detractor ending;
 * otherwise "What do you love?" → promoter ending. Every question is required.
 */
export const seedBranchingSurvey = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  overrides: Partial<Doc<"surveys">> = {}
) => {
  const surveyId = await insertSurvey(ctx, organizationId, {
    endings: [PROMOTER_ENDING, DETRACTOR_ENDING],
    ...overrides,
  });
  const scope = { organizationId, surveyId };
  const score = await insertQuestion(ctx, scope, {
    order: 0,
    required: true,
    title: "How likely are you to recommend us?",
    type: "nps",
  });
  const love = await insertQuestion(ctx, scope, {
    next: { endingId: PROMOTER_ENDING.id, kind: "ending" },
    order: 1,
    required: true,
    title: "What do you love?",
    type: "text",
  });
  const fix = await insertQuestion(ctx, scope, {
    next: { endingId: DETRACTOR_ENDING.id, kind: "ending" },
    order: 2,
    required: true,
    title: "What should we fix?",
    type: "text",
  });
  await ctx.db.patch(score, {
    logic: [
      {
        id: "low-score",
        operator: "less_than",
        target: { kind: "question", questionId: fix },
        value: LOW_SCORE,
      },
    ],
  });
  return { fix, love, score, surveyId };
};
