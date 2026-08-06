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
