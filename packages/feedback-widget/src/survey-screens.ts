import { escapeHtml } from "./survey-html";
import type { SurveyData } from "./types";

const AUTO_CLOSE_DELAY_MS = 5000;

export function renderComplete(
  container: HTMLElement,
  onComplete: () => void,
  isStillComplete: () => boolean
): void {
  container.innerHTML = `
    <div class="reflet-survey" role="dialog" aria-label="Survey completed">
      <div class="reflet-survey-complete reflet-fade-in">
        <div class="reflet-survey-complete-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p class="reflet-survey-complete-title">Thank you!</p>
        <p class="reflet-survey-complete-desc">Your responses have been recorded.</p>
        <button type="button" class="reflet-survey-btn-primary" data-action="close" aria-label="Close survey">Done</button>
      </div>
    </div>
  `;

  container
    .querySelector('[data-action="close"]')
    ?.addEventListener("click", onComplete);

  setTimeout(() => {
    if (isStillComplete()) {
      onComplete();
    }
  }, AUTO_CLOSE_DELAY_MS);
}

export function renderError(
  container: HTMLElement,
  survey: SurveyData,
  message: string,
  handlers: { onDismiss: () => void; onRetry: () => void }
): void {
  container.innerHTML = `
    <div class="reflet-survey" role="dialog" aria-label="Survey error">
      <div class="reflet-survey-header">
        <span class="reflet-survey-title">${escapeHtml(survey.title)}</span>
         <button type="button" class="reflet-survey-close" data-action="dismiss" aria-label="Dismiss survey">&times;</button>
      </div>
      <div class="reflet-error" role="alert">${escapeHtml(message)}</div>
      <div class="reflet-survey-actions">
        <div></div>
        <button type="button" class="reflet-survey-btn-primary" data-action="retry">Try Again</button>
      </div>
    </div>
  `;

  container
    .querySelector('[data-action="dismiss"]')
    ?.addEventListener("click", handlers.onDismiss);

  container
    .querySelector('[data-action="retry"]')
    ?.addEventListener("click", handlers.onRetry);
}
