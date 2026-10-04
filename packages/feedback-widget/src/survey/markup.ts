import {
  type SurveyEnding,
  type SurveyQuestion,
  safeLinkUrl,
} from "@reflet/survey-core";
import type {
  SurveySession,
  SurveySessionSnapshot,
} from "@reflet/survey-core/client";
import { escapeHtml } from "../widget-utils";
import { type OtherChoice, renderQuestionInput } from "./inputs";

const CHECK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>';

const primaryButton = (options: {
  action: string;
  label: string;
  url: string | null;
}): string =>
  options.url
    ? `<a class="reflet-survey-btn-primary" href="${escapeHtml(options.url)}" target="_blank" rel="noopener noreferrer" data-action="${options.action}" data-primary data-autofocus>${escapeHtml(options.label)}</a>`
    : `<button type="button" class="reflet-survey-btn-primary" data-action="${options.action}" data-primary data-autofocus>${escapeHtml(options.label)}</button>`;

const questionStep = (
  question: SurveyQuestion,
  snapshot: SurveySessionSnapshot,
  other: OtherChoice
): string => {
  const isStatement = question.type === "statement";
  const required =
    question.required && !isStatement
      ? ' <span class="reflet-required" aria-hidden="true">*</span>'
      : "";
  const description = question.description
    ? `<p class="reflet-survey-question-desc">${escapeHtml(question.description)}</p>`
    : "";
  const primary = isStatement
    ? primaryButton({
        action: "next",
        label: question.config?.buttonLabel ?? "Next",
        url: safeLinkUrl(question.config?.buttonUrl),
      })
    : `<button type="button" class="reflet-survey-btn-primary" data-action="next" data-primary></button>`;
  return `
    <div class="reflet-survey-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Survey progress"><div class="reflet-survey-progress-bar"></div></div>
    <div class="reflet-survey-question reflet-slide-in-right">
      <p class="reflet-survey-question-title" id="reflet-survey-question" tabindex="-1">${escapeHtml(question.title)}${required}</p>
      ${description}
      <div class="reflet-survey-input">${renderQuestionInput(question, snapshot.answers.get(question._id), other)}</div>
    </div>
    <p class="reflet-survey-validation" role="alert"></p>
    <div class="reflet-survey-actions">
      <button type="button" class="reflet-survey-btn-secondary" data-action="back">Back</button>
      ${primary}
    </div>`;
};

const endingStep = (ending: SurveyEnding): string => {
  const description = ending.description
    ? `<p class="reflet-survey-complete-desc">${escapeHtml(ending.description)}</p>`
    : "";
  const url = safeLinkUrl(ending.buttonUrl);
  const label = ending.buttonLabel ?? (url ? "Open" : "Close");
  return `
    <div class="reflet-survey-complete reflet-fade-in">
      <div class="reflet-survey-complete-icon">${CHECK_ICON}</div>
      <p class="reflet-survey-complete-title" id="reflet-survey-question" tabindex="-1">${escapeHtml(ending.title)}</p>
      ${description}
      ${primaryButton({ action: "close", label, url })}
    </div>`;
};

const startFailedStep = (message: string): string => `
  <p class="reflet-error" role="alert">${escapeHtml(message)}</p>
  <div class="reflet-survey-actions">
    <span></span>
    <button type="button" class="reflet-survey-btn-primary" data-action="retry" data-primary data-autofocus>Try again</button>
  </div>`;

const STARTING_STEP =
  '<div class="reflet-loading" role="status" aria-label="Loading survey"><div class="reflet-spinner"></div></div>';

export const renderStep = (
  session: SurveySession,
  snapshot: SurveySessionSnapshot,
  other: OtherChoice
): string => {
  const isModal = session.survey.display.position === "center";
  let body = STARTING_STEP;
  if (snapshot.phase === "question" && snapshot.question) {
    body = questionStep(snapshot.question, snapshot, other);
  } else if (snapshot.phase === "ending" && snapshot.ending) {
    body = endingStep(snapshot.ending);
  } else if (snapshot.phase === "start_failed") {
    body = startFailedStep(snapshot.error ?? "");
  }
  const title = escapeHtml(session.survey.title);
  return `<div class="reflet-survey" role="dialog" aria-modal="${isModal}" aria-label="${title}" aria-busy="${snapshot.phase === "starting"}"><div class="reflet-survey-header"><span class="reflet-survey-title">${title}</span><button type="button" class="reflet-survey-close" data-action="dismiss" aria-label="Dismiss survey">&times;</button></div>${body}</div>`;
};

/** Changes whenever the respondent moves to a different screen. */
export const stepKeyOf = (snapshot: SurveySessionSnapshot): string =>
  `${snapshot.phase}:${snapshot.question?._id ?? snapshot.ending?.id ?? ""}`;
