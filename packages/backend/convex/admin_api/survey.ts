import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const surveyStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("closed")
);

const triggerTypeValidator = v.union(
  v.literal("manual"),
  v.literal("page_visit"),
  v.literal("time_delay"),
  v.literal("exit_intent"),
  v.literal("feedback_submitted")
);

const questionTypeValidator = v.union(
  v.literal("rating"),
  v.literal("nps"),
  v.literal("text"),
  v.literal("single_choice"),
  v.literal("multiple_choice"),
  v.literal("boolean")
);

export const listSurveys = internalQuery({
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
    })
  ),
  handler: async (ctx, args) => {
    const surveysQuery = args.status
      ? ctx.db
          .query("surveys")
          .withIndex("by_organization_status", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("status", args.status ?? "draft")
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
        };
      })
    );
  },
});

export const getSurvey = internalQuery({
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
      triggerType: triggerTypeValidator,
      triggerConfig: v.optional(
        v.object({
          pageUrl: v.optional(v.string()),
          delayMs: v.optional(v.number()),
          sampleRate: v.optional(v.number()),
        })
      ),
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
          config: v.optional(
            v.object({
              minValue: v.optional(v.number()),
              maxValue: v.optional(v.number()),
              minLabel: v.optional(v.string()),
              maxLabel: v.optional(v.string()),
              choices: v.optional(v.array(v.string())),
              placeholder: v.optional(v.string()),
              maxLength: v.optional(v.number()),
            })
          ),
        })
      ),
      createdAt: v.number(),
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
      .withIndex("by_survey", (q) => q.eq("surveyId", survey._id))
      .collect();

    const sortedQuestions = questions.sort((a, b) => a.order - b.order);

    return {
      _id: survey._id,
      organizationId: survey.organizationId,
      title: survey.title,
      description: survey.description,
      status: survey.status,
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
      })),
      createdAt: survey.createdAt,
    };
  },
});

export const createSurvey = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    triggerType: triggerTypeValidator,
    triggerConfig: v.optional(
      v.object({
        pageUrl: v.optional(v.string()),
        delayMs: v.optional(v.number()),
        sampleRate: v.optional(v.number()),
      })
    ),
    questions: v.array(
      v.object({
        type: questionTypeValidator,
        title: v.string(),
        description: v.optional(v.string()),
        required: v.boolean(),
        order: v.number(),
        config: v.optional(
          v.object({
            minValue: v.optional(v.number()),
            maxValue: v.optional(v.number()),
            minLabel: v.optional(v.string()),
            maxLabel: v.optional(v.string()),
            choices: v.optional(v.array(v.string())),
            placeholder: v.optional(v.string()),
            maxLength: v.optional(v.number()),
          })
        ),
      })
    ),
  },
  returns: v.id("surveys"),
  handler: async (ctx, args) => {
    const surveyId = await ctx.db.insert("surveys", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      status: "draft",
      createdBy: "api-admin",
      triggerType: args.triggerType,
      triggerConfig: args.triggerConfig,
      responseCount: 0,
      completionRate: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    for (const question of args.questions) {
      await ctx.db.insert("surveyQuestions", {
        surveyId,
        organizationId: args.organizationId,
        type: question.type,
        title: question.title,
        description: question.description,
        required: question.required,
        order: question.order,
        config: question.config,
      });
    }

    return surveyId;
  },
});

export const updateSurveyStatus = internalMutation({
  args: {
    surveyId: v.id("surveys"),
    status: surveyStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    await ctx.db.patch(args.surveyId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteSurvey = internalMutation({
  args: {
    surveyId: v.id("surveys"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const questions = await ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();
    for (const question of questions) {
      await ctx.db.delete(question._id);
    }

    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();
    for (const response of responses) {
      const answers = await ctx.db
        .query("surveyAnswers")
        .withIndex("by_response", (q) => q.eq("responseId", response._id))
        .collect();
      for (const answer of answers) {
        await ctx.db.delete(answer._id);
      }
      await ctx.db.delete(response._id);
    }

    await ctx.db.delete(args.surveyId);

    return null;
  },
});

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
