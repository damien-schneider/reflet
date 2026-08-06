import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  answerValueValidator,
  conditionalLogicValidator,
  questionConfigValidator,
  questionTypeValidator,
  triggerConfigValidator,
  triggerTypeValidator,
} from "./tableFields";

const STALE_RESPONSE_HOURS = 24;
const STALE_RESPONSE_BATCH = 200;

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
    if (!survey || survey.organizationId !== args.organizationId) {
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
    organizationId: v.id("organizations"),
    questionId: v.id("surveyQuestions"),
    responseId: v.id("surveyResponses"),
    value: answerValueValidator,
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (!response || response.organizationId !== args.organizationId) {
      throw new Error("Response not found");
    }

    if (response.status !== "in_progress") {
      throw new Error("Response is no longer accepting answers");
    }

    const question = await ctx.db.get(args.questionId);
    if (!question || question.surveyId !== response.surveyId) {
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
    organizationId: v.id("organizations"),
    responseId: v.id("surveyResponses"),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (!response || response.organizationId !== args.organizationId) {
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
      .take(STALE_RESPONSE_BATCH);

    for (const response of staleResponses) {
      await ctx.db.patch(response._id, {
        status: "abandoned",
      });
    }

    return { abandoned: staleResponses.length };
  },
  returns: v.object({ abandoned: v.number() }),
});
