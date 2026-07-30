import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
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

const questionInput = v.object({
  config: questionConfigValidator,
  description: v.optional(v.string()),
  order: v.number(),
  required: v.boolean(),
  title: v.string(),
  type: questionTypeValidator,
});

// ============================================
// MUTATIONS
// ============================================

export const create = mutation({
  args: {
    description: v.optional(v.string()),
    endsAt: v.optional(v.number()),
    maxResponses: v.optional(v.number()),
    organizationId: v.id("organizations"),
    questions: v.array(questionInput),
    startsAt: v.optional(v.number()),
    title: v.string(),
    triggerConfig: triggerConfigValidator,
    triggerType: triggerTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can create surveys");
    }

    const surveyId = await ctx.db.insert("surveys", {
      completionRate: 0,
      createdAt: Date.now(),
      createdBy: user._id,
      description: args.description,
      endsAt: args.endsAt,
      maxResponses: args.maxResponses,
      organizationId: args.organizationId,
      responseCount: 0,
      startsAt: args.startsAt,
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

export const update = mutation({
  args: {
    description: v.optional(v.string()),
    endsAt: v.optional(v.number()),
    maxResponses: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
    triggerConfig: triggerConfigValidator,
    triggerType: v.optional(triggerTypeValidator),
  },
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update surveys");
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

export const updateStatus = mutation({
  args: {
    status: surveyStatusValidator,
    surveyId: v.id("surveys"),
  },
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can change survey status");
    }

    await ctx.db.patch(args.surveyId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
  returns: v.null(),
});

export const deleteSurvey = mutation({
  args: {
    surveyId: v.id("surveys"),
  },
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete surveys");
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

export const duplicate = mutation({
  args: {
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
  },
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can duplicate surveys");
    }

    const newSurveyId = await ctx.db.insert("surveys", {
      completionRate: 0,
      createdAt: Date.now(),
      createdBy: user._id,
      description: survey.description,
      endsAt: undefined,
      maxResponses: survey.maxResponses,
      organizationId: survey.organizationId,
      responseCount: 0,
      startsAt: undefined,
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

export const listResponsesDetailed = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    status: v.optional(responseStatusValidator),
    surveyId: v.id("surveys"),
  },
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

// ============================================
// QUESTION MUTATIONS
// ============================================

export const addQuestion = mutation({
  args: {
    conditionalLogic: conditionalLogicValidator,
    config: questionConfigValidator,
    description: v.optional(v.string()),
    order: v.number(),
    required: v.boolean(),
    surveyId: v.id("surveys"),
    title: v.string(),
    type: questionTypeValidator,
  },
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can manage survey questions");
    }

    return await ctx.db.insert("surveyQuestions", {
      conditionalLogic: args.conditionalLogic,
      config: args.config,
      description: args.description,
      order: args.order,
      organizationId: survey.organizationId,
      required: args.required,
      surveyId: args.surveyId,
      title: args.title,
      type: args.type,
    });
  },
  returns: v.id("surveyQuestions"),
});

export const updateQuestion = mutation({
  args: {
    conditionalLogic: conditionalLogicValidator,
    config: questionConfigValidator,
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    questionId: v.id("surveyQuestions"),
    required: v.optional(v.boolean()),
    title: v.optional(v.string()),
    type: v.optional(questionTypeValidator),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    const survey = await ctx.db.get(question.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", survey.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can manage survey questions");
    }

    const { questionId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(questionId, filteredUpdates);

    return null;
  },
  returns: v.null(),
});

export const deleteQuestion = mutation({
  args: {
    questionId: v.id("surveyQuestions"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    const survey = await ctx.db.get(question.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", survey.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can manage survey questions");
    }

    await ctx.db.delete(args.questionId);

    return null;
  },
  returns: v.null(),
});

export const reorderQuestions = mutation({
  args: {
    questionIds: v.array(v.id("surveyQuestions")),
    surveyId: v.id("surveys"),
  },
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can manage survey questions");
    }

    for (let i = 0; i < args.questionIds.length; i++) {
      await ctx.db.patch(args.questionIds[i], { order: i });
    }

    return null;
  },
  returns: v.null(),
});

// ============================================
// QUERIES
// ============================================

export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(surveyStatusValidator),
  },
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

// ============================================
// RESPONSE COLLECTION (Public / Internal)
// ============================================

export const startResponse = internalMutation({
  args: {
    externalUserId: v.optional(v.id("externalUsers")),
    organizationId: v.id("organizations"),
    pageUrl: v.optional(v.string()),
    respondentId: v.optional(v.string()),
    surveyId: v.id("surveys"),
    userAgent: v.optional(v.string()),
  },
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
      externalUserId: args.externalUserId,
      metadata: {
        pageUrl: args.pageUrl,
        userAgent: args.userAgent,
      },
      organizationId: args.organizationId,
      respondentId: args.respondentId,
      startedAt: Date.now(),
      status: "in_progress",
      surveyId: args.surveyId,
    });
  },
  returns: v.id("surveyResponses"),
});

export const submitAnswer = internalMutation({
  args: {
    questionId: v.id("surveyQuestions"),
    responseId: v.id("surveyResponses"),
    value: answerValueValidator,
  },
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
        answeredAt: Date.now(),
        value: args.value,
      });
      return existing._id;
    }

    return await ctx.db.insert("surveyAnswers", {
      answeredAt: Date.now(),
      organizationId: response.organizationId,
      questionId: args.questionId,
      responseId: args.responseId,
      surveyId: response.surveyId,
      value: args.value,
    });
  },
  returns: v.id("surveyAnswers"),
});

export const completeResponse = internalMutation({
  args: {
    responseId: v.id("surveyResponses"),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (!response) {
      throw new Error("Response not found");
    }

    await ctx.db.patch(args.responseId, {
      completedAt: Date.now(),
      status: "completed",
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
        completionRate:
          totalResponses.length > 0
            ? Math.round((completedCount / totalResponses.length) * 100)
            : 0,
        responseCount: totalResponses.length,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
  returns: v.null(),
});

// ============================================
// ANALYTICS QUERIES
// ============================================

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

export const listResponses = query({
  args: {
    status: v.optional(responseStatusValidator),
    surveyId: v.id("surveys"),
  },
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

// ============================================
// PUBLIC QUERIES FOR WIDGET
// ============================================

export const getActiveSurvey = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    triggerType: v.optional(triggerTypeValidator),
  },
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
      description: survey.description,
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
      title: survey.title,
      triggerConfig: survey.triggerConfig,
      triggerType: survey.triggerType,
    };
  },
  returns: v.union(
    v.object({
      _id: v.id("surveys"),
      description: v.optional(v.string()),
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
      title: v.string(),
      triggerConfig: triggerConfigValidator,
      triggerType: triggerTypeValidator,
    }),
    v.null()
  ),
});

// ============================================
// CLEANUP (Cron)
// ============================================

const STALE_RESPONSE_HOURS = 24;

export const abandonStaleResponses = internalMutation({
  args: {},
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
  returns: v.object({ abandoned: v.number() }),
});
