import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

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
