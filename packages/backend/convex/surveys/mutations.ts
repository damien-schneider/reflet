import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import {
  questionConfigValidator,
  questionTypeValidator,
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
