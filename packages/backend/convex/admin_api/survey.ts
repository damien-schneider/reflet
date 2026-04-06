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
        conditionalLogic: q.conditionalLogic,
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
    triggerConfig: triggerConfigValidator,
    questions: v.array(
      v.object({
        type: questionTypeValidator,
        title: v.string(),
        description: v.optional(v.string()),
        required: v.boolean(),
        order: v.number(),
        config: questionConfigValidator,
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

export const duplicateSurvey = internalMutation({
  args: {
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
  },
  returns: v.id("surveys"),
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const newSurveyId = await ctx.db.insert("surveys", {
      organizationId: survey.organizationId,
      title: args.title ?? `${survey.title} (copy)`,
      description: survey.description,
      status: "draft",
      createdBy: "api-admin",
      triggerType: survey.triggerType,
      triggerConfig: survey.triggerConfig,
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

export const updateSurvey = internalMutation({
  args: {
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    triggerType: v.optional(triggerTypeValidator),
    triggerConfig: triggerConfigValidator,
    maxResponses: v.optional(v.number()),
  },
  returns: v.null(),
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
});
