import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import {
  computeBooleanStats,
  computeChoiceStats,
  computeNumericStats,
} from "./lib/analytics_helpers";
import {
  answerValueValidator,
  conditionalLogicValidator,
  questionConfigValidator,
  questionTypeValidator,
  triggerConfigValidator,
  triggerTypeValidator,
} from "./tableFields";

export const startResponse = internalMutation({
  args: {
    surveyId: v.id("surveys"),
    organizationId: v.id("organizations"),
    externalUserId: v.optional(v.id("externalUsers")),
    respondentId: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.id("surveyResponses"),
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.status !== "active") {
      throw new Error("Survey is not active");
    }

    if (survey.maxResponses && survey.responseCount >= survey.maxResponses) {
      throw new Error("Survey has reached maximum responses");
    }

    return await ctx.db.insert("surveyResponses", {
      surveyId: args.surveyId,
      organizationId: args.organizationId,
      externalUserId: args.externalUserId,
      respondentId: args.respondentId,
      status: "in_progress",
      startedAt: Date.now(),
      metadata: {
        pageUrl: args.pageUrl,
        userAgent: args.userAgent,
      },
    });
  },
});

export const submitAnswer = internalMutation({
  args: {
    responseId: v.id("surveyResponses"),
    questionId: v.id("surveyQuestions"),
    value: answerValueValidator,
  },
  returns: v.id("surveyAnswers"),
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (!response) {
      throw new Error("Response not found");
    }

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    const existing = await ctx.db
      .query("surveyAnswers")
      .withIndex("by_response", (q) => q.eq("responseId", args.responseId))
      .filter((q) => q.eq(q.field("questionId"), args.questionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        answeredAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("surveyAnswers", {
      responseId: args.responseId,
      questionId: args.questionId,
      surveyId: response.surveyId,
      organizationId: response.organizationId,
      value: args.value,
      answeredAt: Date.now(),
    });
  },
});

export const completeResponse = internalMutation({
  args: {
    responseId: v.id("surveyResponses"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (!response) {
      throw new Error("Response not found");
    }

    await ctx.db.patch(args.responseId, {
      status: "completed",
      completedAt: Date.now(),
    });

    const survey = await ctx.db.get(response.surveyId);
    if (survey) {
      const totalResponses = await ctx.db
        .query("surveyResponses")
        .withIndex("by_survey", (q) => q.eq("surveyId", response.surveyId))
        .collect();

      const completedCount = totalResponses.filter(
        (r) => r.status === "completed"
      ).length;

      await ctx.db.patch(response.surveyId, {
        responseCount: totalResponses.length,
        completionRate:
          totalResponses.length > 0
            ? Math.round((completedCount / totalResponses.length) * 100)
            : 0,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

export const getAnalytics = query({
  args: {
    surveyId: v.id("surveys"),
  },
  returns: v.object({
    totalResponses: v.number(),
    completedResponses: v.number(),
    abandonedResponses: v.number(),
    completionRate: v.number(),
    questionStats: v.array(
      v.object({
        questionId: v.id("surveyQuestions"),
        title: v.string(),
        type: questionTypeValidator,
        totalAnswers: v.number(),
        averageValue: v.optional(v.number()),
        distribution: v.optional(
          v.array(
            v.object({
              label: v.string(),
              count: v.number(),
            })
          )
        ),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const completed = responses.filter((r) => r.status === "completed");
    const abandoned = responses.filter((r) => r.status === "abandoned");

    const questions = await ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const sortedQuestions = questions.sort((a, b) => a.order - b.order);

    const questionStats = await Promise.all(
      sortedQuestions.map(async (question) => {
        const answers = await ctx.db
          .query("surveyAnswers")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .collect();

        const isNumeric = question.type === "rating" || question.type === "nps";
        const isChoice =
          question.type === "single_choice" ||
          question.type === "multiple_choice";
        const isBoolean = question.type === "boolean";

        const numeric = isNumeric ? computeNumericStats(answers) : undefined;
        const choiceDist = isChoice ? computeChoiceStats(answers) : undefined;
        const boolDist = isBoolean ? computeBooleanStats(answers) : undefined;

        return {
          questionId: question._id,
          title: question.title,
          type: question.type,
          totalAnswers: answers.length,
          averageValue: numeric?.averageValue,
          distribution: numeric?.distribution ?? choiceDist ?? boolDist,
        };
      })
    );

    return {
      totalResponses: responses.length,
      completedResponses: completed.length,
      abandonedResponses: abandoned.length,
      completionRate:
        responses.length > 0
          ? Math.round((completed.length / responses.length) * 100)
          : 0,
      questionStats,
    };
  },
});

export const getActiveSurvey = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    triggerType: v.optional(triggerTypeValidator),
  },
  returns: v.union(
    v.object({
      _id: v.id("surveys"),
      title: v.string(),
      description: v.optional(v.string()),
      triggerType: triggerTypeValidator,
      triggerConfig: triggerConfigValidator,
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const surveysQuery = args.triggerType
      ? ctx.db
          .query("surveys")
          .withIndex("by_organization_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", "active")
          )
          .filter((q) => q.eq(q.field("triggerType"), args.triggerType))
      : ctx.db
          .query("surveys")
          .withIndex("by_organization_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", "active")
          );

    const survey = await surveysQuery.first();

    if (!survey) {
      return null;
    }

    const now = Date.now();
    if (survey.startsAt && now < survey.startsAt) {
      return null;
    }
    if (survey.endsAt && now > survey.endsAt) {
      return null;
    }
    if (survey.maxResponses && survey.responseCount >= survey.maxResponses) {
      return null;
    }

    const questions = await ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", survey._id))
      .collect();

    const sortedQuestions = questions.sort((a, b) => a.order - b.order);

    return {
      _id: survey._id,
      title: survey.title,
      description: survey.description,
      triggerType: survey.triggerType,
      triggerConfig: survey.triggerConfig,
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
    };
  },
});

const STALE_RESPONSE_HOURS = 24;

export const abandonStaleResponses = internalMutation({
  args: {},
  returns: v.object({ abandoned: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_RESPONSE_HOURS * 60 * 60 * 1000;

    const staleResponses = await ctx.db
      .query("surveyResponses")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "in_progress"),
          q.lt(q.field("startedAt"), cutoff)
        )
      )
      .take(200);

    for (const response of staleResponses) {
      await ctx.db.patch(response._id, {
        status: "abandoned",
      });
    }

    return { abandoned: staleResponses.length };
  },
});
