import { displayOf, endingsOf } from "@reflet/survey-core";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server";
import {
  changeSurveyStatus,
  insertSurveyWithQuestions,
  updateSurveySettings,
} from "../surveys/editing/survey_write";
import { completedSoFar } from "../surveys/lib/completed_count";
import {
  loadSortedQuestions,
  toPublicQuestion,
} from "../surveys/respondent/public_survey";
import {
  publicQuestionValidator,
  questionDraftValidator,
  surveyDisplayValidator,
  surveyEndingValidator,
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
    const { status } = args;
    const surveys = await (status
      ? ctx.db
          .query("surveys")
          .withIndex("by_organization_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", status)
          )
      : ctx.db
          .query("surveys")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", args.organizationId)
          )
    )
      .order("desc")
      .collect();

    return await Promise.all(
      surveys.map(async (survey) => ({
        _id: survey._id,
        completedCount: completedSoFar(survey),
        completionRate: survey.completionRate,
        createdAt: survey.createdAt,
        description: survey.description,
        linkEnabled: survey.linkEnabled ?? false,
        questionCount: (await loadSortedQuestions(ctx, survey._id)).length,
        responseCount: survey.responseCount,
        status: survey.status,
        title: survey.title,
        triggerType: survey.triggerType,
      }))
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("surveys"),
      completedCount: v.number(),
      completionRate: v.number(),
      createdAt: v.number(),
      description: v.optional(v.string()),
      linkEnabled: v.boolean(),
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
    organizationId: v.id("organizations"),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey || survey.organizationId !== args.organizationId) {
      return null;
    }
    const questions = await loadSortedQuestions(ctx, survey._id);
    return {
      _id: survey._id,
      completedCount: completedSoFar(survey),
      completionRate: survey.completionRate,
      createdAt: survey.createdAt,
      description: survey.description,
      display: displayOf(survey.display),
      endings: endingsOf(survey.endings),
      endsAt: survey.endsAt,
      linkEnabled: survey.linkEnabled ?? false,
      maxResponses: survey.maxResponses,
      organizationId: survey.organizationId,
      questions: questions.map(toPublicQuestion),
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
      completedCount: v.number(),
      completionRate: v.number(),
      createdAt: v.number(),
      description: v.optional(v.string()),
      display: surveyDisplayValidator,
      endings: v.array(surveyEndingValidator),
      endsAt: v.optional(v.number()),
      linkEnabled: v.boolean(),
      maxResponses: v.optional(v.number()),
      organizationId: v.id("organizations"),
      questions: v.array(publicQuestionValidator),
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
    display: v.optional(surveyDisplayValidator),
    endings: v.optional(v.array(surveyEndingValidator)),
    organizationId: v.id("organizations"),
    questions: v.array(questionDraftValidator),
    title: v.string(),
    triggerConfig: triggerConfigValidator,
    triggerType: triggerTypeValidator,
  },
  handler: async (ctx, args) =>
    await insertSurveyWithQuestions(ctx, { ...args, createdBy: "api-admin" }),
  returns: v.id("surveys"),
});

export const loadOwnedSurvey = async (
  ctx: QueryCtx,
  args: { organizationId: Id<"organizations">; surveyId: Id<"surveys"> }
): Promise<Doc<"surveys">> => {
  const survey = await ctx.db.get(args.surveyId);
  if (!survey || survey.organizationId !== args.organizationId) {
    throw new ConvexError("Survey not found");
  }
  return survey;
};

export const updateSurvey = internalMutation({
  args: {
    description: v.optional(v.string()),
    display: v.optional(surveyDisplayValidator),
    endings: v.optional(v.array(surveyEndingValidator)),
    endsAt: v.optional(v.union(v.number(), v.null())),
    linkEnabled: v.optional(v.boolean()),
    maxResponses: v.optional(v.union(v.number(), v.null())),
    organizationId: v.id("organizations"),
    startsAt: v.optional(v.union(v.number(), v.null())),
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
    triggerConfig: triggerConfigValidator,
    triggerType: v.optional(triggerTypeValidator),
  },
  handler: async (ctx, { organizationId, surveyId, ...settings }) => {
    const survey = await loadOwnedSurvey(ctx, { organizationId, surveyId });
    await updateSurveySettings(ctx, survey, settings);
    return null;
  },
  returns: v.null(),
});

export const updateSurveyStatus = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    status: surveyStatusValidator,
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    await changeSurveyStatus(
      ctx,
      await loadOwnedSurvey(ctx, args),
      args.status
    );
    return null;
  },
  returns: v.null(),
});
