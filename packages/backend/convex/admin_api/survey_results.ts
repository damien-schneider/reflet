import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { questionTypeValidator } from "../surveys/tableFields";
import { computeAverage, computeDistribution } from "./survey_analytics";

export const getAnalytics = internalQuery({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const completed = responses.filter((r) => r.status === "completed");

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

        return {
          averageValue: computeAverage(question, answers),
          distribution: computeDistribution(question, answers),
          questionId: question._id,
          title: question.title,
          totalAnswers: answers.length,
          type: question.type,
        };
      })
    );

    return {
      completedResponses: completed.length,
      completionRate:
        responses.length > 0
          ? Math.round((completed.length / responses.length) * 100)
          : 0,
      questionStats,
      totalResponses: responses.length,
    };
  },
  returns: v.object({
    completedResponses: v.number(),
    completionRate: v.number(),
    questionStats: v.array(
      v.object({
        averageValue: v.optional(v.number()),
        distribution: v.optional(
          v.array(
            v.object({
              count: v.number(),
              label: v.string(),
            })
          )
        ),
        questionId: v.id("surveyQuestions"),
        title: v.string(),
        totalAnswers: v.number(),
        type: questionTypeValidator,
      })
    ),
    totalResponses: v.number(),
  }),
});

export const listResponses = internalQuery({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("abandoned")
      )
    ),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const pageSize = Math.min(args.limit ?? 50, 100);

    const allResponses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .order("desc")
      .collect();

    const filtered = args.status
      ? allResponses.filter((r) => r.status === args.status)
      : allResponses;

    const pageResponses = filtered.slice(0, pageSize);

    const responses = await Promise.all(
      pageResponses.map(async (response) => {
        const answers = await ctx.db
          .query("surveyAnswers")
          .withIndex("by_response", (q) => q.eq("responseId", response._id))
          .collect();

        return {
          _id: response._id,
          answerCount: answers.length,
          completedAt: response.completedAt,
          pageUrl: response.metadata?.pageUrl,
          respondentId: response.respondentId,
          startedAt: response.startedAt,
          status: response.status,
        };
      })
    );

    return responses;
  },
  returns: v.array(
    v.object({
      _id: v.id("surveyResponses"),
      answerCount: v.number(),
      completedAt: v.optional(v.number()),
      pageUrl: v.optional(v.string()),
      respondentId: v.optional(v.string()),
      startedAt: v.number(),
      status: v.union(
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("abandoned")
      ),
    })
  ),
});
