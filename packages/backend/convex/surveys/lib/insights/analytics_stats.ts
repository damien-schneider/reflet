import type { NpsBreakdown, SurveyEnding } from "@reflet/survey-core";
import { endingsOf, npsBreakdown, sortByOrder } from "@reflet/survey-core";
import { v } from "convex/values";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import { questionTypeValidator } from "../../tableFields";
import { completedSoFar } from "../completed_count";
import {
  emptyTallies,
  type QuestionStats,
  questionStatsOf,
  tallyResponse,
} from "./question_stats";
import { ANALYTICS_READ_LIMITS, loadRecentResponses } from "./recent_responses";

const TREND_DAYS = 30;
const MS_PER_DAY = 86_400_000;
const ISO_DATE_LENGTH = "YYYY-MM-DD".length;

type Response = Doc<"surveyResponses">;

export interface SurveyAnalytics {
  abandonedResponses: number;
  completedResponses: number;
  completionRate: number;
  endings: { count: number; endingId: string; title: string }[];
  inProgressResponses: number;
  medianCompletionMs: number | null;
  nps: (NpsBreakdown & { questionId: Id<"surveyQuestions"> }) | null;
  questionStats: QuestionStats[];
  responsesByDay: { completed: number; date: string; started: number }[];
  /** Responses behind the breakdowns when the survey has more than one query may read; null when every response was read. */
  sampledResponses: number | null;
  totalResponses: number;
}

type SampleBreakdowns = Omit<
  SurveyAnalytics,
  | "completedResponses"
  | "completionRate"
  | "sampledResponses"
  | "totalResponses"
>;

interface AnalyticsInput {
  answersByResponse: ReadonlyMap<
    Id<"surveyResponses">,
    readonly Doc<"surveyAnswers">[]
  >;
  now: number;
  questions: readonly Doc<"surveyQuestions">[];
  responses: readonly Response[];
  storedEndings: readonly SurveyEnding[] | undefined;
}

const utcDate = (timestamp: number): string =>
  new Date(timestamp).toISOString().slice(0, ISO_DATE_LENGTH);

const responsesByDay = (
  responses: readonly Response[],
  now: number
): SurveyAnalytics["responsesByDay"] => {
  const days = new Map<string, { completed: number; started: number }>();
  for (let daysAgo = TREND_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    days.set(utcDate(now - daysAgo * MS_PER_DAY), {
      completed: 0,
      started: 0,
    });
  }
  for (const response of responses) {
    const startedDay = days.get(utcDate(response.startedAt));
    if (startedDay) {
      startedDay.started += 1;
    }
    const completedDay =
      response.status === "completed" && response.completedAt !== undefined
        ? days.get(utcDate(response.completedAt))
        : undefined;
    if (completedDay) {
      completedDay.completed += 1;
    }
  }
  return [...days].map(([date, counts]) => ({ date, ...counts }));
};

const medianCompletionMs = (completed: readonly Response[]): number | null => {
  const durations = completed
    .flatMap((response) =>
      response.completedAt === undefined
        ? []
        : [response.completedAt - response.startedAt]
    )
    .sort((a, b) => a - b);
  if (durations.length === 0) {
    return null;
  }
  const middle = Math.floor(durations.length / 2);
  const upper = durations[middle] ?? 0;
  return durations.length % 2 === 0
    ? Math.round(((durations[middle - 1] ?? upper) + upper) / 2)
    : upper;
};

/** Completions with no ending, the retired default ending, or a since-deleted ending count toward the first ending. */
const endingCounts = (
  completed: readonly Response[],
  storedEndings: readonly SurveyEnding[] | undefined
): SurveyAnalytics["endings"] => {
  const endings = endingsOf(storedEndings);
  const counts = new Map(endings.map((ending) => [ending.id, 0]));
  const firstEndingId = endings[0]?.id ?? "";
  for (const response of completed) {
    const endingId =
      response.endingId !== undefined && counts.has(response.endingId)
        ? response.endingId
        : firstEndingId;
    counts.set(endingId, (counts.get(endingId) ?? 0) + 1);
  }
  return endings.map((ending) => ({
    count: counts.get(ending.id) ?? 0,
    endingId: ending.id,
    title: ending.title,
  }));
};

const summarizeSample = ({
  answersByResponse,
  now,
  questions,
  responses,
  storedEndings,
}: AnalyticsInput): SampleBreakdowns => {
  const sortedQuestions = sortByOrder(questions);
  const tallies = emptyTallies(sortedQuestions);
  for (const response of responses) {
    tallyResponse(
      tallies,
      sortedQuestions,
      storedEndings,
      response,
      answersByResponse.get(response._id) ?? []
    );
  }

  const completed = responses.filter((r) => r.status === "completed");
  const npsQuestion = sortedQuestions.find((q) => q.type === "nps");
  const npsScores =
    (npsQuestion && tallies.get(npsQuestion._id)?.answers) ?? [];

  return {
    abandonedResponses: responses.filter((r) => r.status === "abandoned")
      .length,
    endings: endingCounts(completed, storedEndings),
    inProgressResponses: responses.filter((r) => r.status === "in_progress")
      .length,
    medianCompletionMs: medianCompletionMs(completed),
    nps: npsQuestion
      ? {
          questionId: npsQuestion._id,
          ...npsBreakdown(
            npsScores.flatMap((answer) =>
              typeof answer.value === "number" ? [answer.value] : []
            )
          ),
        }
      : null,
    questionStats: sortedQuestions.map((question) =>
      questionStatsOf(
        question,
        tallies.get(question._id) ?? {
          answers: [],
          dropOffs: 0,
          passedStatements: 0,
        }
      )
    ),
    responsesByDay: responsesByDay(responses, now),
  };
};

export const computeSurveyAnalytics = async (
  ctx: QueryCtx,
  survey: Doc<"surveys">
): Promise<SurveyAnalytics> => {
  const questions = await ctx.db
    .query("surveyQuestions")
    .withIndex("by_survey", (q) => q.eq("surveyId", survey._id))
    .collect();
  const { answersByResponse, responses, truncated } = await loadRecentResponses(
    ctx,
    survey._id,
    ANALYTICS_READ_LIMITS
  );
  return {
    ...summarizeSample({
      answersByResponse,
      now: Date.now(),
      questions,
      responses,
      storedEndings: survey.endings,
    }),
    completedResponses: completedSoFar(survey),
    completionRate: survey.completionRate,
    sampledResponses: truncated ? responses.length : null,
    totalResponses: survey.responseCount,
  };
};

export const surveyAnalyticsValidator = v.object({
  abandonedResponses: v.number(),
  completedResponses: v.number(),
  completionRate: v.number(),
  endings: v.array(
    v.object({ count: v.number(), endingId: v.string(), title: v.string() })
  ),
  inProgressResponses: v.number(),
  medianCompletionMs: v.union(v.number(), v.null()),
  nps: v.union(
    v.object({
      detractors: v.number(),
      passives: v.number(),
      promoters: v.number(),
      questionId: v.id("surveyQuestions"),
      score: v.union(v.number(), v.null()),
      total: v.number(),
    }),
    v.null()
  ),
  questionStats: v.array(
    v.object({
      answered: v.number(),
      averageValue: v.optional(v.number()),
      distribution: v.optional(
        v.array(v.object({ count: v.number(), label: v.string() }))
      ),
      dropOffs: v.number(),
      order: v.number(),
      otherAnswers: v.optional(v.array(v.string())),
      questionId: v.id("surveyQuestions"),
      reached: v.number(),
      recentTextAnswers: v.optional(
        v.array(v.object({ answeredAt: v.number(), value: v.string() }))
      ),
      title: v.string(),
      type: questionTypeValidator,
    })
  ),
  responsesByDay: v.array(
    v.object({
      completed: v.number(),
      date: v.string(),
      started: v.number(),
    })
  ),
  sampledResponses: v.union(v.number(), v.null()),
  totalResponses: v.number(),
});
