import type { AnswerValue, SurveyQuestion } from "@reflet/survey-core";
import type { SurveySessionSnapshot } from "@reflet/survey-core/client";
import { isChoiceSelected, type OtherChoice } from "./inputs";

const isOptionChecked = (
  question: SurveyQuestion,
  answer: AnswerValue | undefined,
  other: OtherChoice,
  option: HTMLElement
): boolean => {
  const value = option.dataset.value ?? "";
  switch (option.dataset.select) {
    case "scale":
      return answer === Number(value);
    case "boolean":
      return answer === (value === "true");
    case "choice": {
      const choice = question.config?.choices?.[Number(value)];
      return choice !== undefined && isChoiceSelected(answer, choice);
    }
    case "other":
      return other.selected;
    default:
      return false;
  }
};

const syncOptions = (
  stage: HTMLElement,
  question: SurveyQuestion,
  answer: AnswerValue | undefined,
  other: OtherChoice
): void => {
  for (const option of stage.querySelectorAll<HTMLElement>("[data-select]")) {
    const checked = isOptionChecked(question, answer, other, option);
    option.setAttribute("aria-checked", String(checked));
    option.classList.toggle("selected", checked);
    if (option.classList.contains("reflet-star-btn")) {
      option.classList.toggle(
        "filled",
        typeof answer === "number" && Number(option.dataset.value) <= answer
      );
    }
  }
  for (const group of stage.querySelectorAll("[data-roving]")) {
    const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
    const current =
      radios.find((radio) => radio.getAttribute("aria-checked") === "true") ??
      radios[0];
    for (const radio of radios) {
      radio.tabIndex = radio === current ? 0 : -1;
    }
  }
};

/** Updates the rendered question in place so typing and focus survive every snapshot. */
export const syncQuestionView = (
  stage: HTMLElement,
  snapshot: SurveySessionSnapshot,
  question: SurveyQuestion,
  other: OtherChoice
): void => {
  const answer = snapshot.answers.get(question._id);
  stage
    .querySelector(".reflet-survey-progress")
    ?.setAttribute(
      "aria-valuenow",
      String(Math.round(snapshot.progress * 100))
    );
  stage
    .querySelector<HTMLElement>(".reflet-survey-progress-bar")
    ?.style.setProperty("--reflet-survey-progress", String(snapshot.progress));
  const validation = stage.querySelector<HTMLElement>(
    ".reflet-survey-validation"
  );
  if (validation) {
    validation.textContent = snapshot.error ?? "";
    validation.hidden = !snapshot.error;
  }
  const back = stage.querySelector<HTMLButtonElement>('[data-action="back"]');
  if (back) {
    back.hidden = !snapshot.canGoBack;
    back.disabled = snapshot.isSubmitting;
  }
  const primary = stage.querySelector("[data-primary]");
  if (primary instanceof HTMLButtonElement) {
    primary.disabled = snapshot.isSubmitting;
    primary.setAttribute("aria-busy", String(snapshot.isSubmitting));
    if (question.type !== "statement") {
      primary.textContent = snapshot.isLastStep ? "Submit" : "Next";
    }
  }
  syncOptions(stage, question, answer, other);
  const counter = stage.querySelector(".reflet-char-count");
  const textarea = stage.querySelector("textarea");
  if (counter && textarea) {
    counter.textContent = `${typeof answer === "string" ? answer.length : 0}/${textarea.maxLength}`;
  }
  const otherInput = stage.querySelector<HTMLInputElement>(
    "[data-other-answer]"
  );
  if (otherInput) {
    otherInput.hidden = !other.selected;
  }
};
