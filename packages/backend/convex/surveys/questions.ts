import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import {
  conditionalLogicValidator,
  questionConfigValidator,
  questionTypeValidator,
} from "./tableFields";

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
