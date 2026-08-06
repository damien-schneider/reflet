import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import {
  answerValueValidator,
  conditionalLogicValidator,
  questionConfigValidator,
  questionTypeValidator,
  responseStatusValidator,
  surveyStatusValidator,
  triggerConfigValidator,
  triggerTypeValidator,
} from "./tableFields";

const MAX_RESPONSE_PAGE_SIZE = 100;
const DEFAULT_RESPONSE_PAGE_SIZE = 50;

export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(surveyStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const { status } = args;
    const surveysQuery = status
      ? ctx.db
          .query("surveys")
          .withIndex("by_organization_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", status)
          )
      : ctx.db
          .query("surveys")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", args.organizationId)
          );

    const surveys = await surveysQuery.order("desc").collect();

    return await Promise.all(
      surveys.map(async (survey) => {
        const questions = await ctx.db
          .query("surveyQuestions")
          .withIndex("by_survey", (q) => q.eq("surveyId", survey._id))
          .collect();

        return {
          _id: survey._id,
          completionRate: survey.completionRate,
          createdAt: survey.createdAt,
          description: survey.description,
          questionCount: questions.length,
          responseCount: survey.responseCount,
          status: survey.status,
          title: survey.title,
          triggerType: survey.triggerType,
          updatedAt: survey.updatedAt,
        };
      })
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("surveys"),
      completionRate: v.number(),
      createdAt: v.number(),
      description: v.optional(v.string()),
      questionCount: v.number(),
      responseCount: v.number(),
      status: surveyStatusValidator,
      title: v.string(),
      triggerType: triggerTypeValidator,
      updatedAt: v.number(),
    })
  ),
});

export const get = query({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      return null;
    }

    await requireOrgMember(ctx, survey.organizationId);

    const questions = await ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const sortedQuestions = questions.sort((a, b) => a.order - b.order);

    return {
      _id: survey._id,
      completionRate: survey.completionRate,
      createdAt: survey.createdAt,
      createdBy: survey.createdBy,
      description: survey.description,
      endsAt: survey.endsAt,
      maxResponses: survey.maxResponses,
      organizationId: survey.organizationId,
      questions: sortedQuestions.map((q) => ({
        _id: q._id,
        conditionalLogic: q.conditionalLogic,
        config: q.config,
        description: q.description,
        order: q.order,
        required: q.required,
        title: q.title,
        type: q.type,
      })),
      responseCount: survey.responseCount,
      startsAt: survey.startsAt,
      status: survey.status,
      title: survey.title,
      triggerConfig: survey.triggerConfig,
      triggerType: survey.triggerType,
      updatedAt: survey.updatedAt,
    };
  },
  returns: v.union(
    v.object({
      _id: v.id("surveys"),
      completionRate: v.number(),
      createdAt: v.number(),
      createdBy: v.string(),
      description: v.optional(v.string()),
      endsAt: v.optional(v.number()),
      maxResponses: v.optional(v.number()),
      organizationId: v.id("organizations"),
      questions: v.array(
        v.object({
          _id: v.id("surveyQuestions"),
          conditionalLogic: conditionalLogicValidator,
          config: questionConfigValidator,
          description: v.optional(v.string()),
          order: v.number(),
          required: v.boolean(),
          title: v.string(),
          type: questionTypeValidator,
        })
      ),
      responseCount: v.number(),
      startsAt: v.optional(v.number()),
      status: surveyStatusValidator,
      title: v.string(),
      triggerConfig: triggerConfigValidator,
      triggerType: triggerTypeValidator,
      updatedAt: v.number(),
    }),
    v.null()
  ),
});

export const listResponses = query({
  args: {
    status: v.optional(responseStatusValidator),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    await requireOrgMember(ctx, survey.organizationId);

    const { status } = args;
    const responsesQuery = status
      ? ctx.db
          .query("surveyResponses")
          .withIndex("by_survey_status", (q) =>
            q.eq("surveyId", args.surveyId).eq("status", status)
          )
      : ctx.db
          .query("surveyResponses")
          .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId));

    const responses = await responsesQuery.order("desc").collect();

    return await Promise.all(
      responses.map(async (response) => {
        const answers = await ctx.db
          .query("surveyAnswers")
          .withIndex("by_response", (q) => q.eq("responseId", response._id))
          .collect();

        return {
          _id: response._id,
          answerCount: answers.length,
          completedAt: response.completedAt,
          respondentId: response.respondentId,
          startedAt: response.startedAt,
          status: response.status,
        };
      })
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("surveyResponses"),
      answerCount: v.number(),
      completedAt: v.optional(v.number()),
      respondentId: v.optional(v.string()),
      startedAt: v.number(),
      status: responseStatusValidator,
    })
  ),
});

export const listResponsesDetailed = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    status: v.optional(responseStatusValidator),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    await requireOrgMember(ctx, survey.organizationId);

    const pageSize = Math.min(
      args.limit ?? DEFAULT_RESPONSE_PAGE_SIZE,
      MAX_RESPONSE_PAGE_SIZE
    );

    const allResponses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .order("desc")
      .collect();

    const filtered = args.status
      ? allResponses.filter((r) => r.status === args.status)
      : allResponses;

    const startIndex = args.cursor
      ? filtered.findIndex((r) => r._id === args.cursor) + 1
      : 0;

    const pageResponses = filtered.slice(startIndex, startIndex + pageSize);

    const questions = await ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const questionMap = new Map(questions.map((q) => [q._id, q]));

    const responses = await Promise.all(
      pageResponses.map(async (response) => {
        const answers = await ctx.db
          .query("surveyAnswers")
          .withIndex("by_response", (q) => q.eq("responseId", response._id))
          .collect();

        return {
          _id: response._id,
          answers: answers.map((a) => {
            const question = questionMap.get(a.questionId);
            return {
              questionId: a.questionId,
              questionTitle: question?.title ?? "Unknown",
              questionType: question?.type ?? "text",
              value: a.value,
            };
          }),
          completedAt: response.completedAt,
          pageUrl: response.metadata?.pageUrl,
          respondentId: response.respondentId,
          startedAt: response.startedAt,
          status: response.status,
        };
      })
    );

    return {
      hasMore: startIndex + pageSize < filtered.length,
      responses,
    };
  },
  returns: v.object({
    hasMore: v.boolean(),
    responses: v.array(
      v.object({
        _id: v.id("surveyResponses"),
        answers: v.array(
          v.object({
            questionId: v.id("surveyQuestions"),
            questionTitle: v.string(),
            questionType: questionTypeValidator,
            value: answerValueValidator,
          })
        ),
        completedAt: v.optional(v.number()),
        pageUrl: v.optional(v.string()),
        respondentId: v.optional(v.string()),
        startedAt: v.number(),
        status: responseStatusValidator,
      })
    ),
  }),
});
