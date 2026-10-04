import {
  type AnswerValue,
  answerIssue,
  DEFAULT_ENDING,
  missingRequiredAnswers,
  walkPath,
} from "@reflet/survey-core";
import { ConvexError, type Infer } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { emitWebhookEvent } from "../../webhooks/mutations";
import { completedSoFar } from "../lib/completed_count";
import type { responseChannelValidator } from "../tableFields";
import type { Respondent } from "./eligibility";
import { loadSortedQuestions } from "./public_survey";

export type ResponseChannel = Infer<typeof responseChannelValidator>;

const PERCENT = 100;

const completionPercent = (completed: number, total: number): number =>
  total > 0 ? Math.round((completed / total) * PERCENT) : 0;

export const startSurveyResponse = async (
  ctx: MutationCtx,
  args: {
    channel: ResponseChannel;
    metadata?: { pageUrl?: string; userAgent?: string };
    respondent: Respondent;
    survey: Doc<"surveys">;
  }
): Promise<Id<"surveyResponses">> => {
  const { survey } = args;
  const now = Date.now();
  const responseCount = survey.responseCount + 1;
  await ctx.db.patch(survey._id, {
    completionRate: completionPercent(completedSoFar(survey), responseCount),
    responseCount,
  });
  return await ctx.db.insert("surveyResponses", {
    channel: args.channel,
    externalUserId: args.respondent.externalUserId,
    metadata: args.metadata,
    organizationId: survey.organizationId,
    respondentId: args.respondent.respondentId,
    startedAt: now,
    status: "in_progress",
    surveyId: survey._id,
  });
};

/** Loads a response the caller may act on: same organization (when known) and same channel. */
export const loadChannelResponse = async (
  ctx: MutationCtx,
  args: {
    channel: ResponseChannel;
    organizationId?: Id<"organizations">;
    responseId: string;
  }
): Promise<Doc<"surveyResponses">> => {
  const responseId = ctx.db.normalizeId("surveyResponses", args.responseId);
  const response = responseId ? await ctx.db.get(responseId) : null;
  const isVisible =
    response !== null &&
    (args.organizationId === undefined ||
      response.organizationId === args.organizationId) &&
    (response.channel ?? "in_app") === args.channel;
  if (!isVisible) {
    throw new ConvexError("Response not found.");
  }
  return response;
};

const requireInProgress = (response: Doc<"surveyResponses">): void => {
  if (response.status !== "in_progress") {
    throw new ConvexError("This response is no longer accepting answers.");
  }
};

/** Stores, replaces or (with `null`) clears one answer. */
export const saveAnswer = async (
  ctx: MutationCtx,
  response: Doc<"surveyResponses">,
  rawQuestionId: string,
  value: AnswerValue | null
): Promise<Id<"surveyAnswers"> | null> => {
  requireInProgress(response);
  const questionId = ctx.db.normalizeId("surveyQuestions", rawQuestionId);
  const question = questionId ? await ctx.db.get(questionId) : null;
  if (!question || question.surveyId !== response.surveyId) {
    throw new ConvexError("Question not found.");
  }
  const existing = await ctx.db
    .query("surveyAnswers")
    .withIndex("by_response", (q) => q.eq("responseId", response._id))
    .filter((q) => q.eq(q.field("questionId"), question._id))
    .first();
  if (value === null) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  }
  const issue = answerIssue(question, value);
  if (issue) {
    throw new ConvexError(issue);
  }
  if (existing) {
    await ctx.db.patch(existing._id, { answeredAt: Date.now(), value });
    return existing._id;
  }
  return await ctx.db.insert("surveyAnswers", {
    answeredAt: Date.now(),
    organizationId: response.organizationId,
    questionId: question._id,
    responseId: response._id,
    surveyId: response.surveyId,
    value,
  });
};

const recordCompletion = async (
  ctx: MutationCtx,
  survey: Doc<"surveys">
): Promise<void> => {
  const completedCount = completedSoFar(survey) + 1;
  const responseCount = Math.max(survey.responseCount, completedCount);
  const reachedCap =
    survey.maxResponses !== undefined && completedCount >= survey.maxResponses;
  await ctx.db.patch(survey._id, {
    completedCount,
    completionRate: completionPercent(completedCount, responseCount),
    responseCount,
    status: reachedCap && survey.status === "active" ? "closed" : survey.status,
  });
};

/**
 * Walks the flow with the stored answers: required questions on the path must be
 * answered, answers left behind by changed choices are dropped, and the reached ending is kept.
 */
export const completeSurveyResponse = async (
  ctx: MutationCtx,
  response: Doc<"surveyResponses">
): Promise<string> => {
  const survey = await ctx.db.get(response.surveyId);
  if (!survey) {
    throw new ConvexError("Survey not found.");
  }
  if (response.status === "completed") {
    return response.endingId ?? DEFAULT_ENDING.id;
  }
  requireInProgress(response);
  const questions = await loadSortedQuestions(ctx, survey._id);

  const storedAnswers = await ctx.db
    .query("surveyAnswers")
    .withIndex("by_response", (q) => q.eq("responseId", response._id))
    .collect();
  const answers = new Map<string, AnswerValue>(
    storedAnswers.map((answer) => [answer.questionId, answer.value])
  );
  const [firstMissing] = missingRequiredAnswers(
    questions,
    answers,
    survey.endings
  );
  if (firstMissing) {
    throw new ConvexError(`Answer “${firstMissing.title}” before finishing.`);
  }

  const path = walkPath(questions, answers, survey.endings);
  const answeredOnPath = new Set<string>(
    path.questions.map((question) => question._id)
  );
  for (const answer of storedAnswers) {
    if (!answeredOnPath.has(answer.questionId)) {
      await ctx.db.delete(answer._id);
    }
  }
  await ctx.db.patch(response._id, {
    completedAt: Date.now(),
    endingId: path.ending.id,
    status: "completed",
  });
  await recordCompletion(ctx, survey);
  await emitWebhookEvent(ctx, {
    event: "survey.response.completed",
    organizationId: survey.organizationId,
    surveyResponseId: response._id,
  });
  return path.ending.id;
};

export const dismissSurveyResponse = async (
  ctx: MutationCtx,
  response: Doc<"surveyResponses">
): Promise<void> => {
  if (response.status === "in_progress") {
    await ctx.db.patch(response._id, { status: "abandoned" });
  }
};
