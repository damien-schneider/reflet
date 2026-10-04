import type { Doc, Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";

interface ReadLimits {
  maxAnswers: number;
  maxResponses: number;
}

export const ANALYTICS_READ_LIMITS: ReadLimits = {
  maxAnswers: 16_000,
  maxResponses: 2000,
};

export const EXPORT_READ_LIMITS: ReadLimits = {
  maxAnswers: 12_000,
  maxResponses: 1000,
};

export interface RecentResponses {
  answersByResponse: Map<Id<"surveyResponses">, Doc<"surveyAnswers">[]>;
  responses: Doc<"surveyResponses">[];
  truncated: boolean;
}

const groupAnswersByResponse = (
  responses: readonly Doc<"surveyResponses">[],
  answers: readonly Doc<"surveyAnswers">[]
): Map<Id<"surveyResponses">, Doc<"surveyAnswers">[]> => {
  const answersByResponse = new Map<
    Id<"surveyResponses">,
    Doc<"surveyAnswers">[]
  >(responses.map((response) => [response._id, []]));
  for (const answer of answers) {
    answersByResponse.get(answer.responseId)?.push(answer);
  }
  return answersByResponse;
};

/**
 * Newest responses with all of their answers, read in two bounded index scans.
 * Relies on every answer being stored after its response started.
 */
export const loadRecentResponses = async (
  ctx: QueryCtx,
  surveyId: Id<"surveys">,
  limits: ReadLimits
): Promise<RecentResponses> => {
  const newest = await ctx.db
    .query("surveyResponses")
    .withIndex("by_survey", (q) => q.eq("surveyId", surveyId))
    .order("desc")
    .take(limits.maxResponses + 1);
  let responses = newest.slice(0, limits.maxResponses);
  let truncated = newest.length > limits.maxResponses;
  if (responses.length === 0) {
    return { answersByResponse: new Map(), responses, truncated };
  }

  const earliestStart = Math.min(...responses.map((r) => r.startedAt));
  const answersNewestFirst = await ctx.db
    .query("surveyAnswers")
    .withIndex("by_survey_date", (q) =>
      q.eq("surveyId", surveyId).gte("answeredAt", earliestStart)
    )
    .order("desc")
    .take(limits.maxAnswers + 1);
  const answers = answersNewestFirst.slice(0, limits.maxAnswers);
  if (answersNewestFirst.length > limits.maxAnswers) {
    const oldestKeptAnsweredAt =
      answersNewestFirst[limits.maxAnswers - 1]?.answeredAt ?? 0;
    responses = responses.filter(
      (response) => response.startedAt > oldestKeptAnsweredAt
    );
    truncated = true;
  }

  return {
    answersByResponse: groupAnswersByResponse(responses, answers),
    responses,
    truncated,
  };
};
