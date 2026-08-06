import { escapeHtml } from "./survey-html";
import type { SurveyQuestion } from "./types";

type AnswerValue = string | number | boolean | string[];

export function renderQuestionInput(
  question: SurveyQuestion,
  answers: Map<string, AnswerValue>
): string {
  const currentValue = answers.get(question._id);

  switch (question.type) {
    case "rating":
      return renderRatingInput(question, currentValue);
    case "nps":
      return renderNpsInput(currentValue);
    case "text":
      return renderTextInput(question, currentValue);
    case "single_choice":
      return renderSingleChoiceInput(question, currentValue);
    case "multiple_choice":
      return renderMultipleChoiceInput(question, currentValue);
    case "boolean":
      return renderBooleanInput(currentValue);
    default:
      return "";
  }
}

export function renderRatingInput(
  question: SurveyQuestion,
  currentValue: AnswerValue | undefined
): string {
  const max = question.config?.maxValue ?? 5;
  const min = question.config?.minValue ?? 1;
  const items: string[] = [];
  for (let i = min; i <= max; i++) {
    const isSelected = currentValue === i;
    items.push(
      `<button type="button" class="reflet-rating-btn ${isSelected ? "selected" : ""}" data-value="${i}" aria-label="Rate ${i} out of ${max}" aria-pressed="${isSelected}" tabindex="0">${i}</button>`
    );
  }
  const hasLabels = question.config?.minLabel || question.config?.maxLabel;
  const labels = hasLabels
    ? `<div class="reflet-rating-labels" aria-hidden="true">
        <span>${escapeHtml(question.config?.minLabel ?? "")}</span>
        <span>${escapeHtml(question.config?.maxLabel ?? "")}</span>
      </div>`
    : "";
  return `<div class="reflet-rating-scale" role="radiogroup" aria-label="Rating scale">${items.join("")}</div>${labels}`;
}

export function renderNpsInput(currentValue: AnswerValue | undefined): string {
  const items: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const isSelected = currentValue === i;
    items.push(
      `<button type="button" class="reflet-nps-btn ${isSelected ? "selected" : ""}" data-value="${i}" aria-label="Score ${i} out of 10" aria-pressed="${isSelected}" tabindex="0">${i}</button>`
    );
  }
  return `
    <div class="reflet-nps-scale" role="radiogroup" aria-label="NPS score">${items.join("")}</div>
    <div class="reflet-rating-labels" aria-hidden="true">
      <span>Not likely</span>
      <span>Very likely</span>
    </div>
  `;
}

export function renderTextInput(
  question: SurveyQuestion,
  currentValue: AnswerValue | undefined
): string {
  const placeholder = escapeHtml(
    question.config?.placeholder ?? "Your answer..."
  );
  const maxLength = question.config?.maxLength ?? 1000;
  const value =
    typeof currentValue === "string" ? escapeHtml(currentValue) : "";
  const charCount = typeof currentValue === "string" ? currentValue.length : 0;
  return `
    <textarea class="reflet-survey-textarea" placeholder="${placeholder}" maxlength="${maxLength}" data-question="${question._id}" aria-label="${escapeHtml(question.title)}">${value}</textarea>
    <div class="reflet-char-count" aria-live="polite">${charCount}/${maxLength}</div>
  `;
}

export function renderSingleChoiceInput(
  question: SurveyQuestion,
  currentValue: AnswerValue | undefined
): string {
  const choices = question.config?.choices ?? [];
  return `<fieldset class="reflet-choice-list" role="radiogroup" aria-label="${escapeHtml(question.title)}">${choices
    .map(
      (choice) =>
        `<label class="reflet-choice-item ${currentValue === choice ? "selected" : ""}">
          <input type="radio" name="q_${question._id}" value="${escapeHtml(choice)}" ${currentValue === choice ? "checked" : ""} />
          <span>${escapeHtml(choice)}</span>
        </label>`
    )
    .join("")}</fieldset>`;
}

export function renderMultipleChoiceInput(
  question: SurveyQuestion,
  currentValue: AnswerValue | undefined
): string {
  const choices = question.config?.choices ?? [];
  const selectedValues = Array.isArray(currentValue) ? currentValue : [];
  return `<fieldset class="reflet-choice-list" role="group" aria-label="${escapeHtml(question.title)}">${choices
    .map(
      (choice) =>
        `<label class="reflet-choice-item ${selectedValues.includes(choice) ? "selected" : ""}">
          <input type="checkbox" name="q_${question._id}" value="${escapeHtml(choice)}" ${selectedValues.includes(choice) ? "checked" : ""} />
          <span>${escapeHtml(choice)}</span>
        </label>`
    )
    .join("")}</fieldset>`;
}

export function renderBooleanInput(
  currentValue: AnswerValue | undefined
): string {
  return `
    <div class="reflet-boolean-btns" role="radiogroup" aria-label="Yes or No">
      <button type="button" class="reflet-bool-btn ${currentValue === true ? "selected" : ""}" data-value="true" aria-pressed="${currentValue === true}" tabindex="0">Yes</button>
      <button type="button" class="reflet-bool-btn ${currentValue === false ? "selected" : ""}" data-value="false" aria-pressed="${currentValue === false}" tabindex="0">No</button>
    </div>
  `;
}
