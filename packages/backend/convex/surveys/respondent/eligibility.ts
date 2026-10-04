import {
  displayOf,
  frequencyAllows,
  isSampledIn,
  isWithinSchedule,
  type RespondentHistory,
} from "@reflet/survey-core";
import type { Infer } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { completedSoFar } from "../lib/completed_count";
import type { triggerTypeValidator } from "../tableFields";
import {
  loadSortedQuestions,
  type PublicSurveyRecord,
  toPublicSurvey,
} from "./public_survey";

export interface Respondent {
  externalUserId?: Id<"externalUsers">;
  respondentId?: string;
}

export const hasReachedCap = (survey: Doc<"surveys">): boolean =>
  survey.maxResponses !== undefined &&
  completedSoFar(survey) >= survey.maxResponses;

/** Why nobody can answer this survey right now, or null when it is open. */
export const surveyClosedReason = (
  survey: Doc<"surveys">,
  now: number
): string | null => {
  if (survey.status !== "active") {
    return "This survey is not accepting responses.";
  }
  if (!isWithinSchedule(survey, now)) {
    return "This survey is not running right now.";
  }
  if (hasReachedCap(survey)) {
    return "This survey has reached its response limit.";
  }
  return null;
};

const responsesOf = async (
  ctx: QueryCtx,
  surveyId: Id<"surveys">,
  { externalUserId, respondentId }: Respondent
): Promise<Doc<"surveyResponses">[]> => {
  const byRespondent = respondentId
    ? await ctx.db
        .query("surveyResponses")
        .withIndex("by_survey_respondent", (q) =>
          q.eq("surveyId", surveyId).eq("respondentId", respondentId)
        )
        .collect()
    : [];
  const byExternalUser = externalUserId
    ? await ctx.db
        .query("surveyResponses")
        .withIndex("by_survey_external_user", (q) =>
          q.eq("surveyId", surveyId).eq("externalUserId", externalUserId)
        )
        .collect()
    : [];
  return [...byRespondent, ...byExternalUser];
};

export const respondentHistory = async (
  ctx: QueryCtx,
  surveyId: Id<"surveys">,
  respondent: Respondent
): Promise<RespondentHistory> => {
  const responses = await responsesOf(ctx, surveyId, respondent);
  const lastShownAt = responses.reduce<number | undefined>(
    (latest, response) =>
      latest === undefined || response.startedAt > latest
        ? response.startedAt
        : latest,
    undefined
  );
  return {
    hasCompleted: responses.some((response) => response.status === "completed"),
    lastShownAt,
  };
};

/** Why this respondent may not see the survey in-app right now, or null when they may. */
export const inAppEligibilityIssue = async (
  ctx: QueryCtx,
  survey: Doc<"surveys">,
  respondent: Respondent,
  now: number
): Promise<string | null> => {
  const closedReason = surveyClosedReason(survey, now);
  if (closedReason) {
    return closedReason;
  }
  const history = await respondentHistory(ctx, survey._id, respondent);
  if (!frequencyAllows(displayOf(survey.display), history, now)) {
    return "This survey was already shown to this respondent.";
  }
  const sampleKey = respondent.externalUserId ?? respondent.respondentId;
  if (!isSampledIn(survey.triggerConfig?.sampleRate, survey._id, sampleKey)) {
    return "This respondent is outside the survey's sample.";
  }
  return null;
};

export const listEligibleSurveys = async (
  ctx: QueryCtx,
  args: {
    now: number;
    organizationId: Id<"organizations">;
    respondent: Respondent;
    surveyId?: Id<"surveys">;
    triggerType?: Infer<typeof triggerTypeValidator>;
  }
): Promise<PublicSurveyRecord[]> => {
  const activeSurveys = await ctx.db
    .query("surveys")
    .withIndex("by_organization_status", (q) =>
      q.eq("organizationId", args.organizationId).eq("status", "active")
    )
    .collect();
  const candidates = activeSurveys.filter(
    (survey) =>
      (args.triggerType === undefined ||
        survey.triggerType === args.triggerType) &&
      (args.surveyId === undefined || survey._id === args.surveyId)
  );
  const eligible: PublicSurveyRecord[] = [];
  for (const survey of candidates) {
    const issue = await inAppEligibilityIssue(
      ctx,
      survey,
      args.respondent,
      args.now
    );
    if (issue === null) {
      eligible.push(
        toPublicSurvey(survey, await loadSortedQuestions(ctx, survey._id))
      );
    }
  }
  return eligible;
};
