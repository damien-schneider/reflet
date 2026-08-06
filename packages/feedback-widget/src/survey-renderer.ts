import type { FeedbackApi } from "./api";
import { escapeHtml } from "./survey-html";
import { renderQuestionInput } from "./survey-inputs";
import { renderComplete, renderError } from "./survey-screens";
import type { SurveyCallbacks, SurveyData, SurveyQuestion } from "./types";

type AnswerValue = string | number | boolean | string[];

type SurveyPhase = "loading" | "question" | "complete" | "error";

interface SurveyState {
  answers: Map<string, AnswerValue>;
  currentQuestionIndex: number;
  direction: "forward" | "backward";
  errorMessage: string | null;
  isSubmitting: boolean;
  phase: SurveyPhase;
  responseId: string | null;
  validationError: string | null;
}

export class SurveyRenderer {
  private readonly container: HTMLElement;
  private readonly api: FeedbackApi;
  private readonly survey: SurveyData;
  private readonly onComplete: () => void;
  private readonly onDismiss: () => void;
  private readonly callbacks: SurveyCallbacks;
  private readonly state: SurveyState;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(params: {
    container: HTMLElement;
    api: FeedbackApi;
    survey: SurveyData;
    onComplete: () => void;
    onDismiss: () => void;
    callbacks?: SurveyCallbacks;
  }) {
    this.container = params.container;
    this.api = params.api;
    this.survey = params.survey;
    this.onComplete = params.onComplete;
    this.onDismiss = params.onDismiss;
    this.callbacks = params.callbacks ?? {};
    this.state = {
      answers: new Map(),
      currentQuestionIndex: 0,
      direction: "forward",
      errorMessage: null,
      isSubmitting: false,
      phase: "loading",
      responseId: null,
      validationError: null,
    };
  }

  async start(): Promise<void> {
    this.state.phase = "loading";
    this.render();
    this.bindKeyboard();

    try {
      const { responseId } = await this.api.startSurveyResponse({
        pageUrl: window.location.href,
        surveyId: this.survey._id,
        userAgent: navigator.userAgent,
      });
      this.state.responseId = responseId;
      this.state.phase = "question";
      this.callbacks.onSurveyStart?.({
        surveyId: this.survey._id,
        title: this.survey.title,
      });
      this.render();
    } catch {
      this.state.phase = "error";
      this.state.errorMessage = "Failed to start survey. Please try again.";
      this.render();
    }
  }

  destroy(): void {
    this.unbindKeyboard();
  }

  private bindKeyboard(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (this.state.phase !== "question") {
        if (this.state.phase === "complete" && e.key === "Enter") {
          this.onComplete();
        }
        if (e.key === "Escape") {
          this.onDismiss();
        }
        return;
      }

      if (e.key === "Escape") {
        this.callbacks.onSurveyDismiss?.({
          answeredCount: this.state.answers.size,
          questionIndex: this.state.currentQuestionIndex,
          surveyId: this.survey._id,
        });
        this.onDismiss();
        return;
      }

      const question = this.survey.questions[this.state.currentQuestionIndex];
      if (!question) {
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && question.type !== "text") {
        e.preventDefault();
        this.handleNext(question);
      }
    };
    document.addEventListener("keydown", this.keydownHandler);
  }

  private unbindKeyboard(): void {
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
  }

  private render(): void {
    switch (this.state.phase) {
      case "loading":
        this.renderLoading();
        return;
      case "complete":
        renderComplete(
          this.container,
          () => this.onComplete(),
          () => this.state.phase === "complete"
        );
        return;
      case "error":
        renderError(
          this.container,
          this.survey,
          this.state.errorMessage ?? "An error occurred",
          {
            onDismiss: () => this.onDismiss(),
            onRetry: async () => {
              this.state.phase = "loading";
              await this.start();
            },
          }
        );
        return;
      case "question":
        break;
      default:
        return;
    }

    const question = this.survey.questions[this.state.currentQuestionIndex];
    if (!question) {
      return;
    }

    const totalQuestions = this.survey.questions.length;
    const currentNum = this.state.currentQuestionIndex + 1;
    const progress = Math.round((currentNum / totalQuestions) * 100);
    const animClass =
      this.state.direction === "forward"
        ? "reflet-slide-in-right"
        : "reflet-slide-in-left";

    this.container.innerHTML = `
      <div class="reflet-survey" role="dialog" aria-label="${escapeHtml(this.survey.title)}" aria-modal="true">
        <div class="reflet-survey-header">
          <span class="reflet-survey-title" id="reflet-survey-title">${escapeHtml(this.survey.title)}</span>
          <button type="button" class="reflet-survey-close" data-action="dismiss" aria-label="Dismiss survey" title="Press Escape to dismiss">&times;</button>
        </div>
        <div class="reflet-survey-progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Survey progress: question ${currentNum} of ${totalQuestions}">
          <div class="reflet-survey-progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="reflet-survey-progress-text" aria-hidden="true">
          <span>${currentNum} of ${totalQuestions}</span>
          <span class="reflet-survey-kbd-hint">Press Enter to continue</span>
        </div>
        <div class="reflet-survey-question ${animClass}" aria-live="polite">
          <p class="reflet-survey-question-title" id="reflet-question-label">${escapeHtml(question.title)}${question.required ? ' <span class="reflet-required" aria-label="required">*</span>' : ""}</p>
          ${question.description ? `<p class="reflet-survey-question-desc">${escapeHtml(question.description)}</p>` : ""}
          <div class="reflet-survey-input" role="group" aria-labelledby="reflet-question-label">
            ${renderQuestionInput(question, this.state.answers)}
          </div>
          ${this.state.validationError ? `<p class="reflet-survey-validation" role="alert">${escapeHtml(this.state.validationError)}</p>` : ""}
        </div>
        <div class="reflet-survey-actions">
          ${currentNum > 1 ? '<button type="button" class="reflet-survey-btn-secondary" data-action="prev" aria-label="Go to previous question">Back</button>' : "<div></div>"}
          <button type="button" class="reflet-survey-btn-primary" data-action="next" ${this.state.isSubmitting ? 'disabled aria-disabled="true"' : ""} aria-label="${currentNum === totalQuestions ? "Submit survey" : "Go to next question"}">
            ${this.state.isSubmitting ? '<span class="reflet-btn-spinner"></span>' : ""}
            ${currentNum === totalQuestions ? "Submit" : "Next"}
          </button>
        </div>
      </div>
    `;

    this.bindEvents(question);
    this.focusFirstInput();
  }

  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="reflet-survey" role="dialog" aria-label="Loading survey" aria-busy="true">
        <div class="reflet-survey-header">
          <span class="reflet-survey-title">${escapeHtml(this.survey.title)}</span>
          <button type="button" class="reflet-survey-close" data-action="dismiss" aria-label="Dismiss survey">&times;</button>
        </div>
        <div class="reflet-loading" aria-label="Loading">
          <div class="reflet-spinner"></div>
        </div>
      </div>
    `;

    this.container
      .querySelector('[data-action="dismiss"]')
      ?.addEventListener("click", () => this.onDismiss());
  }

  private focusFirstInput(): void {
    requestAnimationFrame(() => {
      const textarea = this.container.querySelector(
        ".reflet-survey-textarea"
      ) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        return;
      }

      const firstBtn = this.container.querySelector(
        ".reflet-rating-btn, .reflet-nps-btn, .reflet-bool-btn"
      ) as HTMLElement | null;
      if (firstBtn) {
        firstBtn.focus();
      }
    });
  }

  private bindEvents(question: SurveyQuestion): void {
    const container = this.container;

    container
      .querySelector('[data-action="dismiss"]')
      ?.addEventListener("click", () => {
        this.callbacks.onSurveyDismiss?.({
          answeredCount: this.state.answers.size,
          questionIndex: this.state.currentQuestionIndex,
          surveyId: this.survey._id,
        });
        this.onDismiss();
      });

    container
      .querySelector('[data-action="prev"]')
      ?.addEventListener("click", () => {
        this.state.direction = "backward";
        this.state.currentQuestionIndex--;
        this.state.validationError = null;
        this.render();
      });

    container
      .querySelector('[data-action="next"]')
      ?.addEventListener("click", () => {
        this.handleNext(question);
      });

    // Rating and NPS buttons
    for (const btn of container.querySelectorAll(
      ".reflet-rating-btn, .reflet-nps-btn"
    )) {
      btn.addEventListener("click", () => {
        const value = Number((btn as HTMLElement).dataset.value);
        this.state.answers.set(question._id, value);
        this.state.validationError = null;
        this.render();
      });
    }

    // Boolean buttons
    for (const btn of container.querySelectorAll(".reflet-bool-btn")) {
      btn.addEventListener("click", () => {
        const value = (btn as HTMLElement).dataset.value === "true";
        this.state.answers.set(question._id, value);
        this.state.validationError = null;
        this.render();
      });
    }

    // Text input
    const textarea = container.querySelector(
      ".reflet-survey-textarea"
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.addEventListener("input", () => {
        this.state.answers.set(question._id, textarea.value);
        this.state.validationError = null;
        const charCountEl = container.querySelector(".reflet-char-count");
        if (charCountEl) {
          const maxLength = question.config?.maxLength ?? 1000;
          charCountEl.textContent = `${textarea.value.length}/${maxLength}`;
        }
      });
    }

    // Radio buttons
    for (const radio of container.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][name="q_${question._id}"]`
    )) {
      radio.addEventListener("change", () => {
        this.state.answers.set(question._id, radio.value);
        this.state.validationError = null;
        // Re-render to update selected styling
        this.render();
      });
    }

    // Checkboxes
    const checkboxes = container.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="q_${question._id}"]`
    );
    for (const checkbox of checkboxes) {
      checkbox.addEventListener("change", () => {
        const selected: string[] = [];
        for (const cb of checkboxes) {
          if (cb.checked) {
            selected.push(cb.value);
          }
        }
        this.state.answers.set(question._id, selected);
        this.state.validationError = null;
        this.render();
      });
    }
  }

  private async handleNext(question: SurveyQuestion): Promise<void> {
    const value = this.state.answers.get(question._id);

    if (question.required && (value === undefined || value === "")) {
      this.state.validationError = "This question is required";
      this.render();
      return;
    }

    if (!this.state.responseId) {
      return;
    }

    this.state.isSubmitting = true;
    this.render();

    try {
      if (value !== undefined && value !== "") {
        await this.api.submitSurveyAnswer({
          questionId: question._id,
          responseId: this.state.responseId,
          value: value as string | number | boolean | string[],
        });

        this.callbacks.onQuestionAnswer?.({
          questionId: question._id,
          questionIndex: this.state.currentQuestionIndex,
          surveyId: this.survey._id,
          value,
        });
      }

      if (this.state.currentQuestionIndex < this.survey.questions.length - 1) {
        this.state.currentQuestionIndex++;
        this.state.direction = "forward";
        this.state.isSubmitting = false;
        this.state.validationError = null;
        this.render();
      } else {
        await this.api.completeSurveyResponse(this.state.responseId);
        this.state.phase = "complete";
        this.state.isSubmitting = false;
        this.callbacks.onSurveyComplete?.({
          answeredQuestions: this.state.answers.size,
          responseId: this.state.responseId,
          surveyId: this.survey._id,
          totalQuestions: this.survey.questions.length,
        });
        this.render();
      }
    } catch {
      this.state.isSubmitting = false;
      this.state.validationError = "Failed to save answer. Please try again.";
      this.render();
    }
  }
}
