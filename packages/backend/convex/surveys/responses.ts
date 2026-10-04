import { ConvexError, type ObjectType, v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server";
import {
  inAppEligibilityIssue,
  listEligibleSurveys,
} from "./respondent/eligibility";
import type { PublicSurveyRecord } from "./respondent/public_survey";
import {
  completeSurveyResponse,
  dismissSurveyResponse,
  loadChannelResponse,
  saveAnswer,
  startSurveyResponse,
} from "./respondent/respond";
import {
  answerValueValidator,
  publicSurveyValidator,
  triggerTypeValidator,
} from "./tableFields";

const STALE_RESPONSE_MS = 24 * 60 * 60 * 1000;
const STALE_RESPONSE_BATCH = 200;

const respondentArgs = {
  externalUserId: v.optional(v.id("externalUsers")),
  organizationId: v.id("organizations"),
  respondentId: v.optional(v.string()),
};

const eligibilityArgs = {
  ...respondentArgs,
  surveyId: v.optional(v.string()),
  triggerType: v.optional(triggerTypeValidator),
};

const eligibleFor = async (
  ctx: QueryCtx,
  args: ObjectType<typeof eligibilityArgs>
): Promise<PublicSurveyRecord[]> => {
  const surveyId =
    args.surveyId === undefined
      ? undefined
      : ctx.db.normalizeId("surveys", args.surveyId);
  if (surveyId === null) {
    return [];
  }
  return await listEligibleSurveys(ctx, {
    now: Date.now(),
    organizationId: args.organizationId,
    respondent: {
      externalUserId: args.externalUserId,
      respondentId: args.respondentId,
    },
    surveyId,
    triggerType: args.triggerType,
  });
};

export const getEligibleSurveys = internalQuery({
  args: eligibilityArgs,
  handler: async (ctx, args) => await eligibleFor(ctx, args),
  returns: v.array(publicSurveyValidator),
});

export const getActiveSurvey = internalQuery({
  args: eligibilityArgs,
  handler: async (ctx, args) => {
    const [first] = await eligibleFor(ctx, args);
    return first ?? null;
  },
  returns: v.union(publicSurveyValidator, v.null()),
});

export const startResponse = internalMutation({
  args: {
    ...respondentArgs,
    pageUrl: v.optional(v.string()),
    surveyId: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const surveyId = ctx.db.normalizeId("surveys", args.surveyId);
    const survey = surveyId ? await ctx.db.get(surveyId) : null;
    if (!survey || survey.organizationId !== args.organizationId) {
      throw new ConvexError("Survey not found.");
    }
    const respondent = {
      externalUserId: args.externalUserId,
      respondentId: args.respondentId,
    };
    const issue = await inAppEligibilityIssue(
      ctx,
      survey,
      respondent,
      Date.now()
    );
    if (issue) {
      throw new ConvexError(issue);
    }
    return await startSurveyResponse(ctx, {
      channel: "in_app",
      metadata: { pageUrl: args.pageUrl, userAgent: args.userAgent },
      respondent,
      survey,
    });
  },
  returns: v.id("surveyResponses"),
});

export const submitAnswer = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    questionId: v.string(),
    responseId: v.string(),
    value: v.union(answerValueValidator, v.null()),
  },
  handler: async (ctx, args) => {
    const response = await loadChannelResponse(ctx, {
      channel: "in_app",
      organizationId: args.organizationId,
      responseId: args.responseId,
    });
    return await saveAnswer(ctx, response, args.questionId, args.value);
  },
  returns: v.union(v.id("surveyAnswers"), v.null()),
});

export const completeResponse = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    responseId: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await loadChannelResponse(ctx, {
      channel: "in_app",
      organizationId: args.organizationId,
      responseId: args.responseId,
    });
    return { endingId: await completeSurveyResponse(ctx, response) };
  },
  returns: v.object({ endingId: v.string() }),
});

export const dismissResponse = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    responseId: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await loadChannelResponse(ctx, {
      channel: "in_app",
      organizationId: args.organizationId,
      responseId: args.responseId,
    });
    await dismissSurveyResponse(ctx, response);
    return null;
  },
  returns: v.null(),
});

export const abandonStaleResponses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_RESPONSE_MS;
    const staleResponses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_status_started", (q) =>
        q.eq("status", "in_progress").lt("startedAt", cutoff)
      )
      .take(STALE_RESPONSE_BATCH);

    for (const response of staleResponses) {
      await ctx.db.patch(response._id, { status: "abandoned" });
    }
    if (staleResponses.length === STALE_RESPONSE_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.surveys.responses.abandonStaleResponses,
        {}
      );
    }
    return { abandoned: staleResponses.length };
  },
  returns: v.object({ abandoned: v.number() }),
});
