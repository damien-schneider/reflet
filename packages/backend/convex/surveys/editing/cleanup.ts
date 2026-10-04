import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";

const DELETE_BATCH = 500;

/** Deletes one batch of a question's answers and schedules the rest, keeping each mutation small. */
export const deleteQuestionAnswers = async (
  ctx: MutationCtx,
  questionId: Id<"surveyQuestions">
): Promise<void> => {
  const answers = await ctx.db
    .query("surveyAnswers")
    .withIndex("by_question", (q) => q.eq("questionId", questionId))
    .take(DELETE_BATCH);
  for (const answer of answers) {
    await ctx.db.delete(answer._id);
  }
  if (answers.length === DELETE_BATCH) {
    await ctx.scheduler.runAfter(
      0,
      internal.surveys.editing.cleanup.purgeQuestionAnswers,
      { questionId }
    );
  }
};

const deleteSurveyDataBatch = async (
  ctx: MutationCtx,
  surveyId: Id<"surveys">
): Promise<void> => {
  const answers = await ctx.db
    .query("surveyAnswers")
    .withIndex("by_survey", (q) => q.eq("surveyId", surveyId))
    .take(DELETE_BATCH);
  const responses =
    answers.length < DELETE_BATCH
      ? await ctx.db
          .query("surveyResponses")
          .withIndex("by_survey", (q) => q.eq("surveyId", surveyId))
          .take(DELETE_BATCH - answers.length)
      : [];
  for (const record of [...answers, ...responses]) {
    await ctx.db.delete(record._id);
  }
  if (answers.length + responses.length === DELETE_BATCH) {
    await ctx.scheduler.runAfter(
      0,
      internal.surveys.editing.cleanup.purgeSurveyData,
      { surveyId }
    );
  }
};

/** Removes the survey and its questions now; responses and answers follow in scheduled batches. */
export const deleteSurveyCascade = async (
  ctx: MutationCtx,
  survey: Doc<"surveys">
): Promise<void> => {
  const questions = await ctx.db
    .query("surveyQuestions")
    .withIndex("by_survey", (q) => q.eq("surveyId", survey._id))
    .collect();
  for (const question of questions) {
    await ctx.db.delete(question._id);
  }
  await ctx.db.delete(survey._id);
  await deleteSurveyDataBatch(ctx, survey._id);
};

export const purgeQuestionAnswers = internalMutation({
  args: { questionId: v.id("surveyQuestions") },
  handler: async (ctx, args) => {
    await deleteQuestionAnswers(ctx, args.questionId);
    return null;
  },
  returns: v.null(),
});

export const purgeSurveyData = internalMutation({
  args: { surveyId: v.id("surveys") },
  handler: async (ctx, args) => {
    await deleteSurveyDataBatch(ctx, args.surveyId);
    return null;
  },
  returns: v.null(),
});
