import type { FeedbackApi } from "./api";
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
      currentQuestionIndex: 0,
      answers: new Map(),
      direction: "forward",
      errorMessage: null,
      responseId: null,
      phase: "loading",
      isSubmitting: false,
      validationError: null,
    };
  }

  async start(): Promise<void> {
    this.state.phase = "loading";
    this.render();
    this.bindKeyboard();

    try {
      const { responseId } = await this.api.startSurveyResponse({
        surveyId: this.survey._id,
        pageUrl: window.location.href,
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
          surveyId: this.survey._id,
          questionIndex: this.state.currentQuestionIndex,
          answeredCount: this.state.answers.size,
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
        this.renderComplete();
        return;
      case "error":
        this.renderError(this.state.errorMessage ?? "An error occurred");
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
      <div class="reflet-survey" role="dialog" aria-label="${this.escapeHtml(this.survey.title)}" aria-modal="true">
        <div class="reflet-survey-header">
          <span class="reflet-survey-title" id="reflet-survey-title">${this.escapeHtml(this.survey.title)}</span>
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
          <p class="reflet-survey-question-title" id="reflet-question-label">${this.escapeHtml(question.title)}${question.required ? ' <span class="reflet-required" aria-label="required">*</span>' : ""}</p>
          ${question.description ? `<p class="reflet-survey-question-desc">${this.escapeHtml(question.description)}</p>` : ""}
          <div class="reflet-survey-input" role="group" aria-labelledby="reflet-question-label">
            ${this.renderQuestionInput(question)}
          </div>
          ${this.state.validationError ? `<p class="reflet-survey-validation" role="alert">${this.escapeHtml(this.state.validationError)}</p>` : ""}
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
          <span class="reflet-survey-title">${this.escapeHtml(this.survey.title)}</span>
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

  private renderQuestionInput(question: SurveyQuestion): string {
    const currentValue = this.state.answers.get(question._id);

    switch (question.type) {
      case "rating":
        return this.renderRatingInput(question, currentValue);
      case "nps":
        return this.renderNpsInput(currentValue);
      case "text":
        return this.renderTextInput(question, currentValue);
      case "single_choice":
        return this.renderSingleChoiceInput(question, currentValue);
      case "multiple_choice":
        return this.renderMultipleChoiceInput(question, currentValue);
      case "boolean":
        return this.renderBooleanInput(currentValue);
      default:
        return "";
    }
  }

  private renderRatingInput(
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
          <span>${this.escapeHtml(question.config?.minLabel ?? "")}</span>
          <span>${this.escapeHtml(question.config?.maxLabel ?? "")}</span>
        </div>`
      : "";
    return `<div class="reflet-rating-scale" role="radiogroup" aria-label="Rating scale">${items.join("")}</div>${labels}`;
  }

  private renderNpsInput(currentValue: AnswerValue | undefined): string {
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

  private renderTextInput(
    question: SurveyQuestion,
    currentValue: AnswerValue | undefined
  ): string {
    const placeholder = this.escapeHtml(
      question.config?.placeholder ?? "Your answer..."
    );
    const maxLength = question.config?.maxLength ?? 1000;
    const value =
      typeof currentValue === "string" ? this.escapeHtml(currentValue) : "";
    const charCount =
      typeof currentValue === "string" ? currentValue.length : 0;
    return `
      <textarea class="reflet-survey-textarea" placeholder="${placeholder}" maxlength="${maxLength}" data-question="${question._id}" aria-label="${this.escapeHtml(question.title)}">${value}</textarea>
      <div class="reflet-char-count" aria-live="polite">${charCount}/${maxLength}</div>
    `;
  }

  private renderSingleChoiceInput(
    question: SurveyQuestion,
    currentValue: AnswerValue | undefined
  ): string {
    const choices = question.config?.choices ?? [];
    return `<fieldset class="reflet-choice-list" role="radiogroup" aria-label="${this.escapeHtml(question.title)}">${choices
      .map(
        (choice) =>
          `<label class="reflet-choice-item ${currentValue === choice ? "selected" : ""}">
            <input type="radio" name="q_${question._id}" value="${this.escapeHtml(choice)}" ${currentValue === choice ? "checked" : ""} />
            <span>${this.escapeHtml(choice)}</span>
          </label>`
      )
      .join("")}</fieldset>`;
  }

  private renderMultipleChoiceInput(
    question: SurveyQuestion,
    currentValue: AnswerValue | undefined
  ): string {
    const choices = question.config?.choices ?? [];
    const selectedValues = Array.isArray(currentValue) ? currentValue : [];
    return `<fieldset class="reflet-choice-list" role="group" aria-label="${this.escapeHtml(question.title)}">${choices
      .map(
        (choice) =>
          `<label class="reflet-choice-item ${selectedValues.includes(choice) ? "selected" : ""}">
            <input type="checkbox" name="q_${question._id}" value="${this.escapeHtml(choice)}" ${selectedValues.includes(choice) ? "checked" : ""} />
            <span>${this.escapeHtml(choice)}</span>
          </label>`
      )
      .join("")}</fieldset>`;
  }

  private renderBooleanInput(currentValue: AnswerValue | undefined): string {
    return `
      <div class="reflet-boolean-btns" role="radiogroup" aria-label="Yes or No">
        <button type="button" class="reflet-bool-btn ${currentValue === true ? "selected" : ""}" data-value="true" aria-pressed="${currentValue === true}" tabindex="0">Yes</button>
        <button type="button" class="reflet-bool-btn ${currentValue === false ? "selected" : ""}" data-value="false" aria-pressed="${currentValue === false}" tabindex="0">No</button>
      </div>
    `;
  }

  private bindEvents(question: SurveyQuestion): void {
    const container = this.container;

    container
      .querySelector('[data-action="dismiss"]')
      ?.addEventListener("click", () => {
        this.callbacks.onSurveyDismiss?.({
          surveyId: this.survey._id,
          questionIndex: this.state.currentQuestionIndex,
          answeredCount: this.state.answers.size,
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
          responseId: this.state.responseId,
          questionId: question._id,
          value: value as string | number | boolean | string[],
        });

        this.callbacks.onQuestionAnswer?.({
          surveyId: this.survey._id,
          questionId: question._id,
          questionIndex: this.state.currentQuestionIndex,
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
          surveyId: this.survey._id,
          responseId: this.state.responseId,
          totalQuestions: this.survey.questions.length,
          answeredQuestions: this.state.answers.size,
        });
        this.render();
      }
    } catch {
      this.state.isSubmitting = false;
      this.state.validationError = "Failed to save answer. Please try again.";
      this.render();
    }
  }

  private renderComplete(): void {
    this.container.innerHTML = `
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

    this.container
      .querySelector('[data-action="close"]')
      ?.addEventListener("click", () => {
        this.onComplete();
      });

    // Auto-close after 5 seconds
    setTimeout(() => {
      if (this.state.phase === "complete") {
        this.onComplete();
      }
    }, 5000);
  }

  private renderError(message: string): void {
    this.container.innerHTML = `
      <div class="reflet-survey" role="dialog" aria-label="Survey error">
        <div class="reflet-survey-header">
          <span class="reflet-survey-title">${this.escapeHtml(this.survey.title)}</span>
           <button type="button" class="reflet-survey-close" data-action="dismiss" aria-label="Dismiss survey">&times;</button>
        </div>
        <div class="reflet-error" role="alert">${this.escapeHtml(message)}</div>
        <div class="reflet-survey-actions">
          <div></div>
          <button type="button" class="reflet-survey-btn-primary" data-action="retry">Try Again</button>
        </div>
      </div>
    `;

    this.container
      .querySelector('[data-action="dismiss"]')
      ?.addEventListener("click", () => this.onDismiss());

    this.container
      .querySelector('[data-action="retry"]')
      ?.addEventListener("click", () => {
        this.state.phase = "loading";
        this.start();
      });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
