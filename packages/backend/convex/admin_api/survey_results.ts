import { paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import {
  computeSurveyAnalytics,
  surveyAnalyticsValidator,
} from "../surveys/lib/insights/analytics_stats";
import {
  listResponseRows,
  responseRowValidator,
} from "../surveys/lib/insights/response_rows";
import { responseStatusValidator } from "../surveys/tableFields";
import { loadOwnedSurvey } from "./survey";

const DEFAULT_RESPONSE_PAGE_SIZE = 50;

export const getAnalytics = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) =>
    await computeSurveyAnalytics(ctx, await loadOwnedSurvey(ctx, args)),
  returns: surveyAnalyticsValidator,
});

export const listResponses = internalQuery({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
    organizationId: v.id("organizations"),
    status: v.optional(responseStatusValidator),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await loadOwnedSurvey(ctx, args);
    return await listResponseRows(ctx, {
      paginationOpts: {
        cursor: args.cursor ?? null,
        numItems: args.limit ?? DEFAULT_RESPONSE_PAGE_SIZE,
      },
      status: args.status,
      surveyId: survey._id,
    });
  },
  returns: paginationResultValidator(responseRowValidator),
});
