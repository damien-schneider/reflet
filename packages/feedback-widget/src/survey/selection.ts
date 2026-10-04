import type { AnswerValue, SurveyQuestion } from "@reflet/survey-core";
import { isChoiceSelected, type OtherChoice } from "./inputs";

export interface Selection {
  answer: AnswerValue | undefined;
  autoAdvance: boolean;
  other: OtherChoice;
}

const NO_OTHER: OtherChoice = { selected: false, text: "" };

const listedChoices = (question: SurveyQuestion): string[] =>
  question.config?.choices ?? [];

/** Recovers the "Other" text when the respondent comes back to an answered question. */
export const otherFromAnswer = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined
): OtherChoice => {
  if (!question.config?.allowOther) {
    return NO_OTHER;
  }
  const listed = listedChoices(question);
  const values = Array.isArray(answer) ? answer : [answer];
  const typed = values.find(
    (value): value is string =>
      typeof value === "string" && value !== "" && !listed.includes(value)
  );
  return typed === undefined ? NO_OTHER : { selected: true, text: typed };
};

const choiceAnswer = (
  question: SurveyQuestion,
  picked: string[],
  other: OtherChoice
): AnswerValue | undefined => {
  const otherText = other.selected ? other.text.trim() : "";
  if (question.type === "multiple_choice") {
    const values = otherText ? [...picked, otherText] : picked;
    return values.length > 0 ? values : undefined;
  }
  if (other.selected) {
    return otherText || undefined;
  }
  return picked[0];
};

const pickedChoices = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined
): string[] =>
  listedChoices(question).filter((choice) => isChoiceSelected(answer, choice));

const toggleChoice = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined,
  other: OtherChoice,
  choice: string
): Selection => {
  if (question.type !== "multiple_choice") {
    return {
      answer: choice,
      autoAdvance: !question.config?.allowOther,
      other: { ...other, selected: false },
    };
  }
  const picked = pickedChoices(question, answer);
  const next = picked.includes(choice)
    ? picked.filter((value) => value !== choice)
    : listedChoices(question).filter(
        (value) => value === choice || picked.includes(value)
      );
  return {
    answer: choiceAnswer(question, next, other),
    autoAdvance: false,
    other,
  };
};

const toggleOther = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined,
  other: OtherChoice
): Selection => {
  const isMultiple = question.type === "multiple_choice";
  const nextOther = {
    ...other,
    selected: isMultiple ? !other.selected : true,
  };
  const picked = isMultiple ? pickedChoices(question, answer) : [];
  return {
    answer: choiceAnswer(question, picked, nextOther),
    autoAdvance: false,
    other: nextOther,
  };
};

/** Turns a click on an option (`data-select` / `data-value`) into the question's answer. */
export const selectOption = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined,
  other: OtherChoice,
  option: { kind: string; value: string }
): Selection | null => {
  switch (option.kind) {
    case "scale":
      return { answer: Number(option.value), autoAdvance: true, other };
    case "boolean":
      return { answer: option.value === "true", autoAdvance: true, other };
    case "choice": {
      const choice = listedChoices(question)[Number(option.value)];
      return choice === undefined
        ? null
        : toggleChoice(question, answer, other, choice);
    }
    case "other":
      return toggleOther(question, answer, other);
    default:
      return null;
  }
};

export const typeOther = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined,
  text: string
): Selection => {
  const nextOther = { selected: true, text };
  const picked =
    question.type === "multiple_choice" ? pickedChoices(question, answer) : [];
  return {
    answer: choiceAnswer(question, picked, nextOther),
    autoAdvance: false,
    other: nextOther,
  };
};
