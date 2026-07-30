import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  conditionalLogicValidator,
  questionConfigValidator,
  questionTypeValidator,
  surveyStatusValidator,
  triggerConfigValidator,
  triggerTypeValidator,
} from "../surveys/tableFields";

export const listSurveys = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(surveyStatusValidator),
  },
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
          completionRate: survey.completionRate,
          createdAt: survey.createdAt,
          description: survey.description,
          questionCount: questions.length,
          responseCount: survey.responseCount,
          status: survey.status,
          title: survey.title,
          triggerType: survey.triggerType,
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
    })
  ),
});

export const getSurvey = internalQuery({
  args: {
    surveyId: v.id("surveys"),
  },
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
      completionRate: survey.completionRate,
      createdAt: survey.createdAt,
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
    };
  },
  returns: v.union(
    v.object({
      _id: v.id("surveys"),
      completionRate: v.number(),
      createdAt: v.number(),
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
    }),
    v.null()
  ),
});

export const createSurvey = internalMutation({
  args: {
    description: v.optional(v.string()),
    organizationId: v.id("organizations"),
    questions: v.array(
      v.object({
        config: questionConfigValidator,
        description: v.optional(v.string()),
        order: v.number(),
        required: v.boolean(),
        title: v.string(),
        type: questionTypeValidator,
      })
    ),
    title: v.string(),
    triggerConfig: triggerConfigValidator,
    triggerType: triggerTypeValidator,
  },
  handler: async (ctx, args) => {
    const surveyId = await ctx.db.insert("surveys", {
      completionRate: 0,
      createdAt: Date.now(),
      createdBy: "api-admin",
      description: args.description,
      organizationId: args.organizationId,
      responseCount: 0,
      status: "draft",
      title: args.title,
      triggerConfig: args.triggerConfig,
      triggerType: args.triggerType,
      updatedAt: Date.now(),
    });

    for (const question of args.questions) {
      await ctx.db.insert("surveyQuestions", {
        config: question.config,
        description: question.description,
        order: question.order,
        organizationId: args.organizationId,
        required: question.required,
        surveyId,
        title: question.title,
        type: question.type,
      });
    }

    return surveyId;
  },
  returns: v.id("surveys"),
});

export const updateSurveyStatus = internalMutation({
  args: {
    status: surveyStatusValidator,
    surveyId: v.id("surveys"),
  },
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
  returns: v.null(),
});

export const deleteSurvey = internalMutation({
  args: {
    surveyId: v.id("surveys"),
  },
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
  returns: v.null(),
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
    .map(([label, count]) => ({ count, label }))
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
    .map(([label, count]) => ({ count, label }))
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
    count,
    label,
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
}

function computeAverage(
  question: { type: string },
  answers: Array<{ value: string | number | boolean | string[] }>
): number | undefined {
  if (question.type !== "rating" && question.type !== "nps") {
    return;
  }

  const numericValues = answers
    .map((a) => a.value)
    .filter((v): v is number => typeof v === "number");

  if (numericValues.length === 0) {
    return;
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

export const duplicateSurvey = internalMutation({
  args: {
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const newSurveyId = await ctx.db.insert("surveys", {
      completionRate: 0,
      createdAt: Date.now(),
      createdBy: "api-admin",
      description: survey.description,
      organizationId: survey.organizationId,
      responseCount: 0,
      status: "draft",
      title: args.title ?? `${survey.title} (copy)`,
      triggerConfig: survey.triggerConfig,
      triggerType: survey.triggerType,
      updatedAt: Date.now(),
    });

    const questions = await ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const sortedQuestions = questions.sort((a, b) => a.order - b.order);

    for (const question of sortedQuestions) {
      await ctx.db.insert("surveyQuestions", {
        conditionalLogic: question.conditionalLogic,
        config: question.config,
        description: question.description,
        order: question.order,
        organizationId: survey.organizationId,
        required: question.required,
        surveyId: newSurveyId,
        title: question.title,
        type: question.type,
      });
    }

    return newSurveyId;
  },
  returns: v.id("surveys"),
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

export const updateSurvey = internalMutation({
  args: {
    description: v.optional(v.string()),
    maxResponses: v.optional(v.number()),
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
    triggerConfig: triggerConfigValidator,
    triggerType: v.optional(triggerTypeValidator),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const { surveyId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(surveyId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return null;
  },
  returns: v.null(),
});
