import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import {
  computeSurveyAnalytics,
  surveyAnalyticsValidator,
} from "./lib/insights/analytics_stats";

export const getAnalytics = query({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }
    await requireOrgMember(ctx, survey.organizationId);
    return await computeSurveyAnalytics(ctx, survey);
  },
  returns: surveyAnalyticsValidator,
});
