import { displayOf, endingsOf, sortByOrder } from "@reflet/survey-core";
import type { Infer } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type {
  publicQuestionValidator,
  publicSurveyValidator,
} from "../tableFields";

export type PublicQuestion = Infer<typeof publicQuestionValidator>;
export type PublicSurveyRecord = Infer<typeof publicSurveyValidator>;

export const loadSortedQuestions = async (
  ctx: QueryCtx,
  surveyId: Id<"surveys">
): Promise<Doc<"surveyQuestions">[]> =>
  sortByOrder(
    await ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", surveyId))
      .collect()
  );

export const toPublicQuestion = (
  question: Doc<"surveyQuestions">
): PublicQuestion => ({
  _id: question._id,
  config: question.config,
  description: question.description,
  logic: question.logic,
  next: question.next,
  order: question.order,
  required: question.required,
  title: question.title,
  type: question.type,
});

export const toPublicSurvey = (
  survey: Doc<"surveys">,
  sortedQuestions: readonly Doc<"surveyQuestions">[]
): PublicSurveyRecord => ({
  _id: survey._id,
  description: survey.description,
  display: displayOf(survey.display),
  endings: endingsOf(survey.endings),
  questions: sortedQuestions.map(toPublicQuestion),
  title: survey.title,
  triggerConfig: survey.triggerConfig,
  triggerType: survey.triggerType,
});
