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
  type: questionTypeValidator,
  title: v.string(),
  description: v.optional(v.string()),
  required: v.boolean(),
  order: v.number(),
  config: questionConfigValidator,
});

// ============================================
// MUTATIONS
// ============================================

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    triggerType: triggerTypeValidator,
    triggerConfig: triggerConfigValidator,
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    maxResponses: v.optional(v.number()),
    questions: v.array(questionInput),
  },
  returns: v.id("surveys"),
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
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      status: "draft",
      createdBy: user._id,
      triggerType: args.triggerType,
      triggerConfig: args.triggerConfig,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      maxResponses: args.maxResponses,
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

export const update = mutation({
  args: {
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    triggerType: v.optional(triggerTypeValidator),
    triggerConfig: triggerConfigValidator,
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    maxResponses: v.optional(v.number()),
  },
  returns: v.null(),
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
});

export const updateStatus = mutation({
  args: {
    surveyId: v.id("surveys"),
    status: surveyStatusValidator,
  },
  returns: v.null(),
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
});

export const deleteSurvey = mutation({
  args: {
    surveyId: v.id("surveys"),
  },
  returns: v.null(),
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
});

export const duplicate = mutation({
  args: {
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
  },
  returns: v.id("surveys"),
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
      organizationId: survey.organizationId,
      title: args.title ?? `${survey.title} (copy)`,
      description: survey.description,
      status: "draft",
      createdBy: user._id,
      triggerType: survey.triggerType,
      triggerConfig: survey.triggerConfig,
      startsAt: undefined,
      endsAt: undefined,
      maxResponses: survey.maxResponses,
      responseCount: 0,
      completionRate: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const questions = await ctx.db
      .query("surveyQuestions")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const sortedQuestions = questions.sort((a, b) => a.order - b.order);

    for (const question of sortedQuestions) {
      await ctx.db.insert("surveyQuestions", {
        surveyId: newSurveyId,
        organizationId: survey.organizationId,
        type: question.type,
        title: question.title,
        description: question.description,
        required: question.required,
        order: question.order,
        config: question.config,
        conditionalLogic: question.conditionalLogic,
      });
    }

    return newSurveyId;
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

// ============================================
// QUESTION MUTATIONS
// ============================================

export const addQuestion = mutation({
  args: {
    surveyId: v.id("surveys"),
    type: questionTypeValidator,
    title: v.string(),
    description: v.optional(v.string()),
    required: v.boolean(),
    order: v.number(),
    config: questionConfigValidator,
    conditionalLogic: conditionalLogicValidator,
  },
  returns: v.id("surveyQuestions"),
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
      surveyId: args.surveyId,
      organizationId: survey.organizationId,
      type: args.type,
      title: args.title,
      description: args.description,
      required: args.required,
      order: args.order,
      config: args.config,
      conditionalLogic: args.conditionalLogic,
    });
  },
});

export const updateQuestion = mutation({
  args: {
    questionId: v.id("surveyQuestions"),
    type: v.optional(questionTypeValidator),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    required: v.optional(v.boolean()),
    order: v.optional(v.number()),
    config: questionConfigValidator,
    conditionalLogic: conditionalLogicValidator,
  },
  returns: v.null(),
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
});

export const deleteQuestion = mutation({
  args: {
    questionId: v.id("surveyQuestions"),
  },
  returns: v.null(),
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
});

export const reorderQuestions = mutation({
  args: {
    surveyId: v.id("surveys"),
    questionIds: v.array(v.id("surveyQuestions")),
  },
  returns: v.null(),
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
});

// ============================================
// QUERIES
// ============================================

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

// ============================================
// RESPONSE COLLECTION (Public / Internal)
// ============================================

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
    .map(([label, count]) => ({ label, count }))
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
    .map(([label, count]) => ({ label, count }))
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
    label,
    count,
  }));
}

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

// ============================================
// PUBLIC QUERIES FOR WIDGET
// ============================================

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

// ============================================
// CLEANUP (Cron)
// ============================================

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
