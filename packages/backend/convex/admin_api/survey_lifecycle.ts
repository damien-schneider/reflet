import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { deleteSurveyCascade } from "../surveys/editing/cleanup";
import { duplicateSurveyRecords } from "../surveys/editing/survey_write";
import { loadOwnedSurvey } from "./survey";

export const deleteSurvey = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    await deleteSurveyCascade(ctx, await loadOwnedSurvey(ctx, args));
    return null;
  },
  returns: v.null(),
});

export const duplicateSurvey = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    await duplicateSurveyRecords(ctx, await loadOwnedSurvey(ctx, args), {
      createdBy: "api-admin",
      title: args.title,
    }),
  returns: v.id("surveys"),
});
