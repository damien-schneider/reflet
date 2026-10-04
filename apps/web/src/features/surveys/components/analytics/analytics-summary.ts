import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type SurveyAnalytics = FunctionReturnType<
  typeof api.surveys.analytics.getAnalytics
>;
export type QuestionStat = SurveyAnalytics["questionStats"][number];
export type DailyResponses = SurveyAnalytics["responsesByDay"];

const TREND_WINDOW_DAYS = 7;
const MIN_PREVIOUS_RESPONSES_FOR_TREND = 5;
const PERCENT = 100;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

export const numberFormat = new Intl.NumberFormat();
export const percentFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
  style: "percent",
});
export const averageFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

const startedIn = (days: DailyResponses): number =>
  days.reduce((sum, day) => sum + day.started, 0);

/** Percent change of responses started in the last 7 days vs the 7 days before; null when the earlier week is too small to compare. */
export const weekOverWeekChange = (
  responsesByDay: DailyResponses
): number | null => {
  const recentWeek = responsesByDay.slice(-TREND_WINDOW_DAYS);
  const previousWeek = responsesByDay.slice(
    -2 * TREND_WINDOW_DAYS,
    -TREND_WINDOW_DAYS
  );
  const previousCount = startedIn(previousWeek);
  if (previousCount < MIN_PREVIOUS_RESPONSES_FOR_TREND) {
    return null;
  }
  return Math.round(
    ((startedIn(recentWeek) - previousCount) / previousCount) * PERCENT
  );
};

export const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.round(durationMs / MS_PER_SECOND);
  if (totalSeconds < SECONDS_PER_MINUTE) {
    return `${totalSeconds}s`;
  }
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  if (totalMinutes < MINUTES_PER_HOUR) {
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    return seconds === 0 ? `${totalMinutes}m` : `${totalMinutes}m ${seconds}s`;
  }
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};

/** The step that lost the most respondents; ties go to the higher drop-off rate. */
export const worstDropOffStep = (
  steps: readonly QuestionStat[]
): QuestionStat | undefined => {
  let worst: QuestionStat | undefined;
  for (const step of steps) {
    if (step.dropOffs === 0) {
      continue;
    }
    const losesMore =
      worst === undefined ||
      step.dropOffs > worst.dropOffs ||
      (step.dropOffs === worst.dropOffs &&
        step.dropOffs / step.reached > worst.dropOffs / worst.reached);
    if (losesMore) {
      worst = step;
    }
  }
  return worst;
};

export const shareOf = (count: number, total: number): number =>
  total > 0 ? count / total : 0;
