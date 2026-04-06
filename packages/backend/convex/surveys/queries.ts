import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
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

export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(surveyStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("surveys"),
      title: v.string(),
      description: v.optional(v.string()),
      status: surveyStatusValidator,
      triggerType: triggerTypeValidator,
      responseCount: v.number(),
      completionRate: v.number(),
      questionCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
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
          title: survey.title,
          description: survey.description,
          status: survey.status,
          triggerType: survey.triggerType,
          responseCount: survey.responseCount,
          completionRate: survey.completionRate,
          questionCount: questions.length,
          createdAt: survey.createdAt,
          updatedAt: survey.updatedAt,
        };
      })
    );
  },
});

export const get = query({
  args: {
    surveyId: v.id("surveys"),
  },
  returns: v.union(
    v.object({
      _id: v.id("surveys"),
      organizationId: v.id("organizations"),
      title: v.string(),
      description: v.optional(v.string()),
      status: surveyStatusValidator,
      createdBy: v.string(),
      triggerType: triggerTypeValidator,
      triggerConfig: triggerConfigValidator,
      startsAt: v.optional(v.number()),
      endsAt: v.optional(v.number()),
      maxResponses: v.optional(v.number()),
      responseCount: v.number(),
      completionRate: v.number(),
      questions: v.array(
        v.object({
          _id: v.id("surveyQuestions"),
          type: questionTypeValidator,
          title: v.string(),
          description: v.optional(v.string()),
          required: v.boolean(),
          order: v.number(),
          config: questionConfigValidator,
          conditionalLogic: conditionalLogicValidator,
        })
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      return null;
    }

    const questions = await ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const sortedQuestions = questions.sort((a, b) => a.order - b.order);

    return {
      _id: survey._id,
      organizationId: survey.organizationId,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      createdBy: survey.createdBy,
      triggerType: survey.triggerType,
      triggerConfig: survey.triggerConfig,
      startsAt: survey.startsAt,
      endsAt: survey.endsAt,
      maxResponses: survey.maxResponses,
      responseCount: survey.responseCount,
      completionRate: survey.completionRate,
      questions: sortedQuestions.map((q) => ({
        _id: q._id,
        type: q.type,
        title: q.title,
        description: q.description,
        required: q.required,
        order: q.order,
        config: q.config,
        conditionalLogic: q.conditionalLogic,
      })),
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
    };
  },
});

export const listResponses = query({
  args: {
    surveyId: v.id("surveys"),
    status: v.optional(responseStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("surveyResponses"),
      respondentId: v.optional(v.string()),
      status: responseStatusValidator,
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      answerCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
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
          respondentId: response.respondentId,
          status: response.status,
          startedAt: response.startedAt,
          completedAt: response.completedAt,
          answerCount: answers.length,
        };
      })
    );
  },
});

export const listResponsesDetailed = query({
  args: {
    surveyId: v.id("surveys"),
    status: v.optional(responseStatusValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    responses: v.array(
      v.object({
        _id: v.id("surveyResponses"),
        status: responseStatusValidator,
        respondentId: v.optional(v.string()),
        pageUrl: v.optional(v.string()),
        startedAt: v.number(),
        completedAt: v.optional(v.number()),
        answers: v.array(
          v.object({
            questionId: v.id("surveyQuestions"),
            questionTitle: v.string(),
            questionType: questionTypeValidator,
            value: answerValueValidator,
          })
        ),
      })
    ),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", survey.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const pageSize = Math.min(args.limit ?? 50, 100);

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
          status: response.status,
          respondentId: response.respondentId,
          pageUrl: response.metadata?.pageUrl,
          startedAt: response.startedAt,
          completedAt: response.completedAt,
          answers: answers.map((a) => {
            const question = questionMap.get(a.questionId);
            return {
              questionId: a.questionId,
              questionTitle: question?.title ?? "Unknown",
              questionType: question?.type ?? "text",
              value: a.value,
            };
          }),
        };
      })
    );

    return {
      responses,
      hasMore: startIndex + pageSize < filtered.length,
    };
  },
});
