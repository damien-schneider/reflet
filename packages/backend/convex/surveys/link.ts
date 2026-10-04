import { displayOf } from "@reflet/survey-core";
import { ConvexError, v } from "convex/values";
import { type MutationCtx, mutation, query } from "../_generated/server";
import { rateLimiter } from "../shared/rate_limits";
import {
  respondentHistory,
  surveyClosedReason,
} from "./respondent/eligibility";
import {
  loadSortedQuestions,
  toPublicSurvey,
} from "./respondent/public_survey";
import {
  completeSurveyResponse,
  loadChannelResponse,
  saveAnswer,
  startSurveyResponse,
} from "./respondent/respond";
import { answerValueValidator, publicSurveyValidator } from "./tableFields";

const MAX_RESPONDENT_ID_LENGTH = 200;

export const get = query({
  args: { respondentId: v.string(), surveyId: v.string() },
  handler: async (ctx, args) => {
    const surveyId = ctx.db.normalizeId("surveys", args.surveyId);
    const survey = surveyId ? await ctx.db.get(surveyId) : null;
    if (!survey?.linkEnabled || surveyClosedReason(survey, Date.now())) {
      return null;
    }
    const organization = await ctx.db.get(survey.organizationId);
    if (!organization) {
      return null;
    }
    const history = await respondentHistory(ctx, survey._id, {
      respondentId: args.respondentId,
    });
    return {
      alreadyCompleted: history.hasCompleted,
      organization: {
        logo: organization.logo,
        name: organization.name,
        primaryColor: organization.primaryColor,
        slug: organization.slug,
      },
      survey: toPublicSurvey(
        survey,
        await loadSortedQuestions(ctx, survey._id)
      ),
    };
  },
  returns: v.union(
    v.object({
      alreadyCompleted: v.boolean(),
      organization: v.object({
        logo: v.optional(v.string()),
        name: v.string(),
        primaryColor: v.optional(v.string()),
        slug: v.string(),
      }),
      survey: publicSurveyValidator,
    }),
    v.null()
  ),
});

const enforceLinkLimit = async (
  ctx: MutationCtx,
  name:
    | "surveyLinkAnswerPerResponse"
    | "surveyLinkCompletePerResponse"
    | "surveyLinkStartPerRespondent"
    | "surveyLinkStartPerSurvey",
  key: string
): Promise<void> => {
  const { ok } = await rateLimiter.limit(ctx, name, { key });
  if (!ok) {
    throw new ConvexError("Too many requests. Try again in a minute.");
  }
};

export const start = mutation({
  args: { respondentId: v.string(), surveyId: v.id("surveys") },
  handler: async (ctx, args) => {
    if (
      args.respondentId.trim() === "" ||
      args.respondentId.length > MAX_RESPONDENT_ID_LENGTH
    ) {
      throw new ConvexError("Invalid respondent.");
    }
    const survey = await ctx.db.get(args.surveyId);
    if (!survey?.linkEnabled) {
      throw new ConvexError("Survey not found.");
    }
    const closedReason = surveyClosedReason(survey, Date.now());
    if (closedReason) {
      throw new ConvexError(closedReason);
    }
    const respondent = { respondentId: args.respondentId };
    const history = await respondentHistory(ctx, survey._id, respondent);
    const mayAnswerAgain = displayOf(survey.display).frequency === "recurring";
    if (history.hasCompleted && !mayAnswerAgain) {
      throw new ConvexError("You already answered this survey.");
    }
    await enforceLinkLimit(ctx, "surveyLinkStartPerSurvey", survey._id);
    await enforceLinkLimit(
      ctx,
      "surveyLinkStartPerRespondent",
      `${survey._id}:${args.respondentId}`
    );
    return await startSurveyResponse(ctx, {
      channel: "link",
      respondent,
      survey,
    });
  },
  returns: v.id("surveyResponses"),
});

export const answer = mutation({
  args: {
    questionId: v.id("surveyQuestions"),
    responseId: v.id("surveyResponses"),
    value: v.union(answerValueValidator, v.null()),
  },
  handler: async (ctx, args) => {
    await enforceLinkLimit(ctx, "surveyLinkAnswerPerResponse", args.responseId);
    const response = await loadChannelResponse(ctx, {
      channel: "link",
      responseId: args.responseId,
    });
    return await saveAnswer(ctx, response, args.questionId, args.value);
  },
  returns: v.union(v.id("surveyAnswers"), v.null()),
});

export const complete = mutation({
  args: { responseId: v.id("surveyResponses") },
  handler: async (ctx, args) => {
    await enforceLinkLimit(
      ctx,
      "surveyLinkCompletePerResponse",
      args.responseId
    );
    const response = await loadChannelResponse(ctx, {
      channel: "link",
      responseId: args.responseId,
    });
    return { endingId: await completeSurveyResponse(ctx, response) };
  },
  returns: v.object({ endingId: v.string() }),
});
