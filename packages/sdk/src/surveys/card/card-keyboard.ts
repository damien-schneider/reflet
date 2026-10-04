import { ratingRange, type SurveyQuestion } from "@reflet/survey-core";

export type CardKeyAction =
  | { kind: "close" }
  | { kind: "next" }
  | { kind: "pick"; value: boolean | number | string };

const DIGIT = /^\d$/;

const pickByKey = (
  key: string,
  question: SurveyQuestion
): CardKeyAction | null => {
  if (question.type === "boolean") {
    const lower = key.toLowerCase();
    if (lower === "y") {
      return { kind: "pick", value: true };
    }
    return lower === "n" ? { kind: "pick", value: false } : null;
  }
  if (!DIGIT.test(key)) {
    return null;
  }
  const digit = Number(key);
  if (question.type === "nps") {
    return { kind: "pick", value: digit };
  }
  if (question.type === "rating") {
    const { max, min } = ratingRange(question.config);
    return digit >= min && digit <= max ? { kind: "pick", value: digit } : null;
  }
  if (question.type === "single_choice") {
    const choice = question.config?.choices?.[digit - 1];
    return choice === undefined ? null : { kind: "pick", value: choice };
  }
  return null;
};

/**
 * Enter moves on, Escape closes, and digits (or Y/N) answer single-click
 * questions — except while typing, where keys belong to the field.
 */
export const cardKeyAction = (
  event: {
    ctrlKey: boolean;
    key: string;
    metaKey: boolean;
    target: EventTarget;
  },
  question: SurveyQuestion | null
): CardKeyAction | null => {
  const { target } = event;
  if (event.key === "Escape") {
    return { kind: "close" };
  }
  const isTextArea = target instanceof HTMLTextAreaElement;
  const isTextInput = target instanceof HTMLInputElement;
  if (event.key === "Enter") {
    if (isTextArea) {
      return event.metaKey || event.ctrlKey ? { kind: "next" } : null;
    }
    const isActivatable =
      target instanceof HTMLButtonElement ||
      target instanceof HTMLAnchorElement;
    return isActivatable || !question ? null : { kind: "next" };
  }
  if (isTextArea || isTextInput || !question) {
    return null;
  }
  return pickByKey(event.key, question);
};
