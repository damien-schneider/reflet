import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import {
  conditionalLogicValidator,
  questionConfigValidator,
  questionTypeValidator,
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

const pickDefined = (
  updates: Record<string, unknown>
): Record<string, unknown> => {
  const defined: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      defined[key] = value;
    }
  }
  return defined;
};

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
    const { user } = await requireOrgAdmin(
      ctx,
      args.organizationId,
      "create surveys"
    );

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
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    await requireOrgAdmin(ctx, survey.organizationId, "update surveys");

    const { surveyId, ...updates } = args;

    await ctx.db.patch(surveyId, {
      ...pickDefined(updates),
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
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    await requireOrgAdmin(ctx, survey.organizationId, "change survey status");

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
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    await requireOrgAdmin(ctx, survey.organizationId, "delete surveys");

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
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const { user } = await requireOrgAdmin(
      ctx,
      survey.organizationId,
      "duplicate surveys"
    );

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
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    await requireOrgAdmin(
      ctx,
      survey.organizationId,
      "manage survey questions"
    );

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
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    await requireOrgAdmin(
      ctx,
      question.organizationId,
      "manage survey questions"
    );

    const { questionId, ...updates } = args;

    await ctx.db.patch(questionId, pickDefined(updates));

    return null;
  },
  returns: v.null(),
});

export const deleteQuestion = mutation({
  args: {
    questionId: v.id("surveyQuestions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    await requireOrgAdmin(
      ctx,
      question.organizationId,
      "manage survey questions"
    );

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
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    await requireOrgAdmin(
      ctx,
      survey.organizationId,
      "manage survey questions"
    );

    for (const [index, questionId] of args.questionIds.entries()) {
      const question = await ctx.db.get(questionId);
      if (!question || question.surveyId !== args.surveyId) {
        throw new Error("Question does not belong to this survey");
      }
      await ctx.db.patch(questionId, { order: index });
    }

    return null;
  },
  returns: v.null(),
});
