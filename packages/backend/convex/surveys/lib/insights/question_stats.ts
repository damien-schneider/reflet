import type { AnswerValue, SurveyEnding } from "@reflet/survey-core";
import {
  isEmptyAnswer,
  NPS_MAX,
  NPS_MIN,
  ratingRange,
  takesAnswer,
  walkPath,
} from "@reflet/survey-core";
import type { Doc, Id } from "../../../_generated/dataModel";

const RECENT_TEXT_ANSWER_LIMIT = 20;
const OTHER_ANSWER_LIMIT = 50;
const AVERAGE_PRECISION = 10;

type Question = Doc<"surveyQuestions">;
type Answer = Doc<"surveyAnswers">;

export interface DistributionEntry {
  count: number;
  label: string;
}

export interface QuestionStats {
  answered: number;
  averageValue?: number;
  distribution?: DistributionEntry[];
  dropOffs: number;
  order: number;
  otherAnswers?: string[];
  questionId: Id<"surveyQuestions">;
  reached: number;
  recentTextAnswers?: { answeredAt: number; value: string }[];
  title: string;
  type: Question["type"];
}

interface QuestionTally {
  answers: Answer[];
  dropOffs: number;
  passedStatements: number;
}

export type QuestionTallies = Map<Id<"surveyQuestions">, QuestionTally>;

export const emptyTallies = (questions: readonly Question[]): QuestionTallies =>
  new Map(
    questions.map((question) => [
      question._id,
      { answers: [], dropOffs: 0, passedStatements: 0 },
    ])
  );

const latestAnswerPerQuestion = (
  answers: readonly Answer[]
): Map<Id<"surveyQuestions">, Answer> => {
  const latest = new Map<Id<"surveyQuestions">, Answer>();
  for (const answer of answers) {
    const known = latest.get(answer.questionId);
    if (!known || answer.answeredAt > known.answeredAt) {
      latest.set(answer.questionId, answer);
    }
  }
  return latest;
};

/**
 * A respondent who stopped early dropped off at the first screen after their
 * last answer on the path they walked; skipped optional questions before that
 * point were seen, not abandoned.
 */
export const tallyResponse = (
  tallies: QuestionTallies,
  sortedQuestions: readonly Question[],
  endings: readonly SurveyEnding[] | undefined,
  response: Doc<"surveyResponses">,
  answers: readonly Answer[]
): void => {
  const answerByQuestion = latestAnswerPerQuestion(answers);
  const values = new Map<string, AnswerValue>();
  for (const [questionId, answer] of answerByQuestion) {
    values.set(questionId, answer.value);
  }
  const path = walkPath(sortedQuestions, values, endings).questions;
  const isAnswered = (question: Question) =>
    takesAnswer(question.type) && !isEmptyAnswer(values.get(question._id));

  let lastAnsweredIndex = -1;
  path.forEach((question, index) => {
    if (isAnswered(question)) {
      lastAnsweredIndex = index;
    }
  });
  const stopIndex =
    response.status === "completed" ? path.length : lastAnsweredIndex + 1;

  for (const question of path.slice(0, stopIndex)) {
    const tally = tallies.get(question._id);
    const answer = answerByQuestion.get(question._id);
    if (tally && answer && isAnswered(question)) {
      tally.answers.push(answer);
    } else if (tally && !takesAnswer(question.type)) {
      tally.passedStatements += 1;
    }
  }
  const dropOffQuestion = path[stopIndex];
  const dropOffTally = dropOffQuestion && tallies.get(dropOffQuestion._id);
  if (dropOffTally) {
    dropOffTally.dropOffs += 1;
  }
};

const averageOf = (values: readonly number[]): number | undefined =>
  values.length === 0
    ? undefined
    : Math.round(
        (values.reduce((sum, value) => sum + value, 0) / values.length) *
          AVERAGE_PRECISION
      ) / AVERAGE_PRECISION;

const scaleStats = (
  question: Question,
  answers: readonly Answer[]
): Pick<QuestionStats, "averageValue" | "distribution"> => {
  const { max, min } =
    question.type === "nps"
      ? { max: NPS_MAX, min: NPS_MIN }
      : ratingRange(question.config);
  const values = answers.flatMap((answer) =>
    typeof answer.value === "number" ? [answer.value] : []
  );
  const distribution: DistributionEntry[] = [];
  for (let point = min; point <= max; point += 1) {
    distribution.push({
      count: values.filter((value) => value === point).length,
      label: String(point),
    });
  }
  return { averageValue: averageOf(values), distribution };
};

const choiceStats = (
  question: Question,
  answersNewestFirst: readonly Answer[]
): Pick<QuestionStats, "distribution" | "otherAnswers"> => {
  const choices = question.config?.choices ?? [];
  const counts = new Map(choices.map((choice) => [choice, 0]));
  const otherAnswers: string[] = [];
  for (const answer of answersNewestFirst) {
    const picked = Array.isArray(answer.value) ? answer.value : [answer.value];
    for (const value of picked) {
      if (typeof value !== "string" || value.trim() === "") {
        continue;
      }
      const count = counts.get(value);
      if (count === undefined) {
        otherAnswers.push(value);
      } else {
        counts.set(value, count + 1);
      }
    }
  }
  return {
    distribution: choices.map((choice) => ({
      count: counts.get(choice) ?? 0,
      label: choice,
    })),
    otherAnswers: otherAnswers.slice(0, OTHER_ANSWER_LIMIT),
  };
};

const answerBreakdown = (
  question: Question,
  answersNewestFirst: readonly Answer[]
): Partial<QuestionStats> => {
  switch (question.type) {
    case "rating":
    case "nps":
      return scaleStats(question, answersNewestFirst);
    case "single_choice":
    case "multiple_choice":
      return choiceStats(question, answersNewestFirst);
    case "boolean":
      return {
        distribution: [
          {
            count: answersNewestFirst.filter((a) => a.value === true).length,
            label: "Yes",
          },
          {
            count: answersNewestFirst.filter((a) => a.value === false).length,
            label: "No",
          },
        ],
      };
    case "text":
      return {
        recentTextAnswers: answersNewestFirst
          .flatMap((answer) =>
            typeof answer.value === "string"
              ? [{ answeredAt: answer.answeredAt, value: answer.value }]
              : []
          )
          .slice(0, RECENT_TEXT_ANSWER_LIMIT),
      };
    default:
      return {};
  }
};

export const questionStatsOf = (
  question: Question,
  tally: QuestionTally
): QuestionStats => {
  const answered = takesAnswer(question.type)
    ? tally.answers.length
    : tally.passedStatements;
  const answersNewestFirst = [...tally.answers].sort(
    (a, b) => b.answeredAt - a.answeredAt
  );
  return {
    ...answerBreakdown(question, answersNewestFirst),
    answered,
    dropOffs: tally.dropOffs,
    order: question.order,
    questionId: question._id,
    reached: answered + tally.dropOffs,
    title: question.title,
    type: question.type,
  };
};
