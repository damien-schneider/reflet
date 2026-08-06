import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import { questionTypeValidator } from "./tableFields";

interface DistEntry {
  count: number;
  label: string;
}

type AnswerValue = string | number | boolean | string[];

function computeNumericStats(answers: Array<{ value: AnswerValue }>): {
  averageValue?: number;
  distribution: DistEntry[];
} {
  const numericValues = answers
    .map((a) => a.value)
    .filter((v): v is number => typeof v === "number");

  const averageValue =
    numericValues.length > 0
      ? Math.round(
          (numericValues.reduce((sum, v) => sum + v, 0) /
            numericValues.length) *
            10
        ) / 10
      : undefined;

  const counts = new Map<string, number>();
  for (const val of numericValues) {
    const key = String(val);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const distribution = Array.from(counts.entries())
    .map(([label, count]) => ({ count, label }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  return { averageValue, distribution };
}

function computeChoiceStats(
  answers: Array<{ value: AnswerValue }>
): DistEntry[] {
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
    .map(([label, count]) => ({ count, label }))
    .sort((a, b) => b.count - a.count);
}

function computeBooleanStats(
  answers: Array<{ value: AnswerValue }>
): DistEntry[] {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const key = String(answer.value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, count]) => ({
    count,
    label,
  }));
}

export const getAnalytics = query({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    await requireOrgMember(ctx, survey.organizationId);

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
          averageValue: numeric?.averageValue,
          distribution: numeric?.distribution ?? choiceDist ?? boolDist,
          questionId: question._id,
          title: question.title,
          totalAnswers: answers.length,
          type: question.type,
        };
      })
    );

    return {
      abandonedResponses: abandoned.length,
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
    abandonedResponses: v.number(),
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
