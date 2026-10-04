import type { AnswerValue } from "@reflet/survey-core";
import type { PaginationOptions, PaginationResult } from "convex/server";
import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import {
  answerValueValidator,
  questionTypeValidator,
  responseChannelValidator,
  responseStatusValidator,
} from "../../tableFields";

const MAX_RESPONSE_PAGE_SIZE = 100;

type Response = Doc<"surveyResponses">;
type Question = Doc<"surveyQuestions">;
type ExternalUsers = Map<Id<"externalUsers">, Doc<"externalUsers">>;

const responseFields = {
  channel: responseChannelValidator,
  completedAt: v.optional(v.number()),
  endingId: v.optional(v.string()),
  pageUrl: v.optional(v.string()),
  startedAt: v.number(),
  status: responseStatusValidator,
};

export const responseRowValidator = v.object({
  ...responseFields,
  _id: v.id("surveyResponses"),
  answers: v.array(
    v.object({
      questionId: v.id("surveyQuestions"),
      questionTitle: v.string(),
      questionType: questionTypeValidator,
      value: answerValueValidator,
    })
  ),
  respondent: v.object({
    email: v.optional(v.string()),
    id: v.optional(v.string()),
    identified: v.boolean(),
    name: v.optional(v.string()),
  }),
});

export const exportRowValidator = v.object({
  ...responseFields,
  answers: v.record(v.string(), answerValueValidator),
  respondentEmail: v.optional(v.string()),
  respondentId: v.optional(v.string()),
  respondentName: v.optional(v.string()),
  responseId: v.id("surveyResponses"),
});

export const loadExternalUsers = async (
  ctx: QueryCtx,
  responses: readonly Response[]
): Promise<ExternalUsers> => {
  const userIds = new Set<Id<"externalUsers">>();
  for (const response of responses) {
    if (response.externalUserId) {
      userIds.add(response.externalUserId);
    }
  }
  const users: ExternalUsers = new Map();
  for (const user of await Promise.all(
    [...userIds].map((userId) => ctx.db.get(userId))
  )) {
    if (user) {
      users.set(user._id, user);
    }
  }
  return users;
};

/** Identified respondents are shown by the customer's own user id. */
const respondentOf = (response: Response, users: ExternalUsers) => {
  const user = response.externalUserId
    ? users.get(response.externalUserId)
    : undefined;
  return {
    email: user?.email,
    id: user?.externalId ?? response.respondentId,
    identified: user !== undefined,
    name: user?.name,
  };
};

const toResponseRow = (
  response: Response,
  answers: readonly Doc<"surveyAnswers">[],
  questionsById: ReadonlyMap<Id<"surveyQuestions">, Question>,
  users: ExternalUsers
): Infer<typeof responseRowValidator> => ({
  _id: response._id,
  answers: answers
    .flatMap((answer) => {
      const question = questionsById.get(answer.questionId);
      return question ? [{ answer, question }] : [];
    })
    .sort((a, b) => a.question.order - b.question.order)
    .map(({ answer, question }) => ({
      questionId: question._id,
      questionTitle: question.title,
      questionType: question.type,
      value: answer.value,
    })),
  channel: response.channel ?? "in_app",
  completedAt: response.completedAt,
  endingId: response.endingId,
  pageUrl: response.metadata?.pageUrl,
  respondent: respondentOf(response, users),
  startedAt: response.startedAt,
  status: response.status,
});

export const listResponseRows = async (
  ctx: QueryCtx,
  {
    paginationOpts,
    status,
    surveyId,
  }: {
    paginationOpts: PaginationOptions;
    status?: Response["status"];
    surveyId: Id<"surveys">;
  }
): Promise<PaginationResult<Infer<typeof responseRowValidator>>> => {
  const responsesQuery = status
    ? ctx.db
        .query("surveyResponses")
        .withIndex("by_survey_status", (q) =>
          q.eq("surveyId", surveyId).eq("status", status)
        )
    : ctx.db
        .query("surveyResponses")
        .withIndex("by_survey", (q) => q.eq("surveyId", surveyId));
  const result = await responsesQuery.order("desc").paginate({
    ...paginationOpts,
    numItems: Math.min(paginationOpts.numItems, MAX_RESPONSE_PAGE_SIZE),
  });

  const [questions, users, answersPerResponse] = await Promise.all([
    ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", surveyId))
      .collect(),
    loadExternalUsers(ctx, result.page),
    Promise.all(
      result.page.map((response) =>
        ctx.db
          .query("surveyAnswers")
          .withIndex("by_response", (q) => q.eq("responseId", response._id))
          .collect()
      )
    ),
  ]);
  const questionsById = new Map(questions.map((q) => [q._id, q]));

  return {
    ...result,
    page: result.page.map((response, index) =>
      toResponseRow(
        response,
        answersPerResponse[index] ?? [],
        questionsById,
        users
      )
    ),
  };
};

export const toExportRow = (
  response: Response,
  answers: readonly Doc<"surveyAnswers">[],
  questionsById: ReadonlyMap<Id<"surveyQuestions">, Question>,
  users: ExternalUsers
) => {
  const answersByQuestion: Record<string, AnswerValue> = {};
  for (const answer of answers) {
    if (questionsById.has(answer.questionId)) {
      answersByQuestion[answer.questionId] = answer.value;
    }
  }
  const respondent = respondentOf(response, users);
  return {
    answers: answersByQuestion,
    channel: response.channel ?? "in_app",
    completedAt: response.completedAt,
    endingId: response.endingId,
    pageUrl: response.metadata?.pageUrl,
    respondentEmail: respondent.email,
    respondentId: respondent.id,
    respondentName: respondent.name,
    responseId: response._id,
    startedAt: response.startedAt,
    status: response.status,
  };
};
