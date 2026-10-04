import {
  type AnswerValue,
  MAX_OTHER_CHOICE_CHARS,
  NPS_MAX,
  NPS_MIN,
  ratingRange,
  type SurveyQuestion,
  textMaxChars,
} from "@reflet/survey-core";
import { escapeHtml } from "../widget-utils";

export interface OtherChoice {
  selected: boolean;
  text: string;
}

const EMOJI_SCALES: Record<number, readonly string[]> = {
  3: ["🙁", "😐", "🙂"],
  5: ["😠", "🙁", "😐", "🙂", "😍"],
};

const STAR_ICON =
  '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';

const OTHER_LABEL = "Other";

const range = (min: number, max: number): number[] =>
  Array.from(
    { length: Math.max(0, max - min + 1) },
    (_, offset) => min + offset
  );

const radio = (attributes: {
  checked: boolean;
  className: string;
  content: string;
  label: string;
  select: string;
  value: string;
}): string =>
  `<button type="button" role="radio" class="${attributes.className}${attributes.checked ? " selected" : ""}" aria-checked="${attributes.checked}" aria-label="${escapeHtml(attributes.label)}" data-select="${attributes.select}" data-value="${escapeHtml(attributes.value)}">${attributes.content}</button>`;

const scaleLabels = (minLabel?: string, maxLabel?: string): string =>
  minLabel || maxLabel
    ? `<div class="reflet-rating-labels" aria-hidden="true"><span>${escapeHtml(minLabel ?? "")}</span><span>${escapeHtml(maxLabel ?? "")}</span></div>`
    : "";

const ratingContent = (
  question: SurveyQuestion,
  value: number,
  index: number,
  count: number
): { className: string; content: string } => {
  const style = question.config?.ratingStyle ?? "number";
  const emoji = EMOJI_SCALES[count]?.[index];
  if (style === "emoji" && emoji) {
    return { className: "reflet-rating-btn reflet-emoji-btn", content: emoji };
  }
  if (style === "star") {
    return { className: "reflet-star-btn", content: STAR_ICON };
  }
  return { className: "reflet-rating-btn", content: String(value) };
};

const renderRating = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined
): string => {
  const { max, min } = ratingRange(question.config);
  const values = range(min, max);
  const isStar = question.config?.ratingStyle === "star";
  const buttons = values.map((value, index) => {
    const { className, content } = ratingContent(
      question,
      value,
      index,
      values.length
    );
    const filled = isStar && typeof answer === "number" && value <= answer;
    return radio({
      checked: answer === value,
      className: filled ? `${className} filled` : className,
      content,
      label: `${value} out of ${max}`,
      select: "scale",
      value: String(value),
    });
  });
  const scaleClass = isStar ? "reflet-star-scale" : "reflet-rating-scale";
  return `<div class="${scaleClass}" role="radiogroup" aria-labelledby="reflet-survey-question" data-roving>${buttons.join("")}</div>${scaleLabels(question.config?.minLabel, question.config?.maxLabel)}`;
};

const renderNps = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined
): string => {
  const buttons = range(NPS_MIN, NPS_MAX).map((value) =>
    radio({
      checked: answer === value,
      className: "reflet-nps-btn",
      content: String(value),
      label: `${value} out of ${NPS_MAX}`,
      select: "scale",
      value: String(value),
    })
  );
  return `<div class="reflet-nps-scale" role="radiogroup" aria-labelledby="reflet-survey-question" data-roving>${buttons.join("")}</div>${scaleLabels(question.config?.minLabel ?? "Not likely", question.config?.maxLabel ?? "Very likely")}`;
};

const renderBoolean = (answer: AnswerValue | undefined): string => {
  const buttons = [true, false].map((value) => {
    const label = value ? "Yes" : "No";
    return radio({
      checked: answer === value,
      className: "reflet-bool-btn",
      content: label,
      label,
      select: "boolean",
      value: String(value),
    });
  });
  return `<div class="reflet-boolean-btns" role="radiogroup" aria-labelledby="reflet-survey-question" data-roving>${buttons.join("")}</div>`;
};

const renderText = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined
): string => {
  const maxChars = textMaxChars(question.config);
  const text = typeof answer === "string" ? answer : "";
  const placeholder = escapeHtml(
    question.config?.placeholder ?? "Your answer..."
  );
  return `<textarea class="reflet-survey-textarea" placeholder="${placeholder}" maxlength="${maxChars}" aria-labelledby="reflet-survey-question" aria-describedby="reflet-survey-char-count" data-text-answer data-autofocus>${escapeHtml(text)}</textarea><div class="reflet-char-count" id="reflet-survey-char-count">${text.length}/${maxChars}</div>`;
};

export const isChoiceSelected = (
  answer: AnswerValue | undefined,
  choice: string
): boolean =>
  Array.isArray(answer) ? answer.includes(choice) : answer === choice;

const renderChoices = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined,
  other: OtherChoice
): string => {
  const isMultiple = question.type === "multiple_choice";
  const role = isMultiple ? "checkbox" : "radio";
  const choices = question.config?.choices ?? [];
  const option = (
    select: string,
    index: number,
    label: string,
    checked: boolean
  ) =>
    `<button type="button" role="${role}" class="reflet-choice-item${checked ? " selected" : ""}" aria-checked="${checked}" data-select="${select}" data-value="${index}"><span class="reflet-choice-mark" aria-hidden="true"></span><span>${escapeHtml(label)}</span></button>`;
  const items = choices.map((choice, index) =>
    option("choice", index, choice, isChoiceSelected(answer, choice))
  );
  if (question.config?.allowOther) {
    items.push(option("other", choices.length, OTHER_LABEL, other.selected));
  }
  const otherInput = question.config?.allowOther
    ? `<input type="text" class="reflet-survey-other-input" maxlength="${MAX_OTHER_CHOICE_CHARS}" placeholder="Please specify" aria-label="Other answer" value="${escapeHtml(other.text)}" data-other-answer${other.selected ? "" : " hidden"} />`
    : "";
  const groupRole = isMultiple ? "group" : "radiogroup";
  const roving = isMultiple ? "" : " data-roving";
  return `<div class="reflet-choice-list" role="${groupRole}" aria-labelledby="reflet-survey-question"${roving}>${items.join("")}</div>${otherInput}`;
};

export const renderQuestionInput = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined,
  other: OtherChoice
): string => {
  switch (question.type) {
    case "rating":
      return renderRating(question, answer);
    case "nps":
      return renderNps(question, answer);
    case "boolean":
      return renderBoolean(answer);
    case "text":
      return renderText(question, answer);
    case "single_choice":
    case "multiple_choice":
      return renderChoices(question, answer, other);
    default:
      return "";
  }
};
