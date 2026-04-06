import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { questionTypeValidator } from "../surveys/tableFields";

function computeNumericDistribution(
  answers: Array<{ value: string | number | boolean | string[] }>
): Array<{ label: string; count: number }> {
  const numericValues = answers
    .map((a) => a.value)
    .filter((v): v is number => typeof v === "number");

  const counts = new Map<string, number>();
  for (const val of numericValues) {
    const key = String(val);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => Number(a.label) - Number(b.label));
}

function computeChoiceDistribution(
  answers: Array<{ value: string | number | boolean | string[] }>
): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const val = answer.value;
    if (typeof val === "string") {
      counts.set(val, (counts.get(val) ?? 0) + 1);
    } else if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === "string") {
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function computeBooleanDistribution(
  answers: Array<{ value: string | number | boolean | string[] }>
): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const key = String(answer.value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, count]) => ({
    label,
    count,
  }));
}

function computeDistribution(
  question: { type: string },
  answers: Array<{ value: string | number | boolean | string[] }>
): Array<{ label: string; count: number }> | undefined {
  if (question.type === "rating" || question.type === "nps") {
    return computeNumericDistribution(answers);
  }
  if (
    question.type === "single_choice" ||
    question.type === "multiple_choice"
  ) {
    return computeChoiceDistribution(answers);
  }
  if (question.type === "boolean") {
    return computeBooleanDistribution(answers);
  }
  return undefined;
}

function computeAverage(
  question: { type: string },
  answers: Array<{ value: string | number | boolean | string[] }>
): number | undefined {
  if (question.type !== "rating" && question.type !== "nps") {
    return undefined;
  }

  const numericValues = answers
    .map((a) => a.value)
    .filter((v): v is number => typeof v === "number");

  if (numericValues.length === 0) {
    return undefined;
  }

  return (
    Math.round(
      (numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length) * 10
    ) / 10
  );
}

export const getAnalytics = internalQuery({
  args: {
    surveyId: v.id("surveys"),
  },
  returns: v.object({
    totalResponses: v.number(),
    completedResponses: v.number(),
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
          questionId: question._id,
          title: question.title,
          type: question.type,
          totalAnswers: answers.length,
          averageValue: computeAverage(question, answers),
          distribution: computeDistribution(question, answers),
        };
      })
    );

    return {
      totalResponses: responses.length,
      completedResponses: completed.length,
      completionRate:
        responses.length > 0
          ? Math.round((completed.length / responses.length) * 100)
          : 0,
      questionStats,
    };
  },
});

export const listResponses = internalQuery({
  args: {
    surveyId: v.id("surveys"),
    status: v.optional(
      v.union(
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("abandoned")
      )
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("surveyResponses"),
      status: v.union(
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("abandoned")
      ),
      respondentId: v.optional(v.string()),
      pageUrl: v.optional(v.string()),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      answerCount: v.number(),
    })
  ),
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
          status: response.status,
          respondentId: response.respondentId,
          pageUrl: response.metadata?.pageUrl,
          startedAt: response.startedAt,
          completedAt: response.completedAt,
          answerCount: answers.length,
        };
      })
    );

    return responses;
  },
});
