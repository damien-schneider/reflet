import {
  MAX_OTHER_CHOICE_CHARS,
  NPS_MAX,
  NPS_MIN,
  ratingRange,
  textMaxChars,
} from "./defaults";
import type { AnswerValue, QuestionConfig, SurveyQuestion } from "./types";

type AnsweredQuestion = Pick<SurveyQuestion, "config" | "type">;

const isIntegerBetween = (value: AnswerValue, min: number, max: number) =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;

/** A choice outside the list is accepted only as the respondent's "Other" text. */
const choiceIssue = (
  choice: unknown,
  config: QuestionConfig | undefined
): string | null => {
  if (typeof choice !== "string" || choice.trim() === "") {
    return "Pick one of the options.";
  }
  if (config?.choices?.includes(choice)) {
    return null;
  }
  if (!config?.allowOther) {
    return "Pick one of the options.";
  }
  return choice.length > MAX_OTHER_CHOICE_CHARS
    ? `Keep “Other” under ${MAX_OTHER_CHOICE_CHARS} characters.`
    : null;
};

const multipleChoiceIssue = (
  value: AnswerValue,
  config: QuestionConfig | undefined
): string | null => {
  if (!Array.isArray(value)) {
    return "Pick at least one option.";
  }
  if (new Set(value).size !== value.length) {
    return "Each option can only be picked once.";
  }
  const listed = config?.choices ?? [];
  const others = value.filter((choice) => !listed.includes(choice));
  if (others.length > 1) {
    return "Only one “Other” answer is allowed.";
  }
  return others.length === 1 ? choiceIssue(others[0], config) : null;
};

/** Why `value` can't be stored for `question`, or null when it's a valid answer. */
export const answerIssue = (
  question: AnsweredQuestion,
  value: AnswerValue
): string | null => {
  switch (question.type) {
    case "rating": {
      const { max, min } = ratingRange(question.config);
      return isIntegerBetween(value, min, max)
        ? null
        : `Pick a rating from ${min} to ${max}.`;
    }
    case "nps":
      return isIntegerBetween(value, NPS_MIN, NPS_MAX)
        ? null
        : `Pick a score from ${NPS_MIN} to ${NPS_MAX}.`;
    case "boolean":
      return typeof value === "boolean" ? null : "Answer yes or no.";
    case "text": {
      if (typeof value !== "string") {
        return "Type an answer.";
      }
      const max = textMaxChars(question.config);
      return value.length > max
        ? `Keep your answer under ${max} characters.`
        : null;
    }
    case "single_choice":
      return choiceIssue(value, question.config);
    case "multiple_choice":
      return multipleChoiceIssue(value, question.config);
    case "statement":
      return "This step doesn’t take an answer.";
    default:
      return "Unknown question type.";
  }
};
