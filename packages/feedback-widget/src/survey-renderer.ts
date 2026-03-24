import type { FeedbackApi } from "./api";
import type { SurveyData, SurveyQuestion } from "./types";

interface SurveyState {
  answers: Map<string, string | number | boolean | string[]>;
  currentQuestionIndex: number;
  isComplete: boolean;
  isSubmitting: boolean;
  responseId: string | null;
}

export class SurveyRenderer {
  private readonly container: HTMLElement;
  private readonly api: FeedbackApi;
  private readonly survey: SurveyData;
  private readonly onComplete: () => void;
  private readonly onDismiss: () => void;
  private readonly state: SurveyState;

  constructor(params: {
    container: HTMLElement;
    api: FeedbackApi;
    survey: SurveyData;
    onComplete: () => void;
    onDismiss: () => void;
  }) {
    this.container = params.container;
    this.api = params.api;
    this.survey = params.survey;
    this.onComplete = params.onComplete;
    this.onDismiss = params.onDismiss;
    this.state = {
      currentQuestionIndex: 0,
      answers: new Map(),
      responseId: null,
      isSubmitting: false,
      isComplete: false,
    };
  }

  async start(): Promise<void> {
    try {
      const { responseId } = await this.api.startSurveyResponse({
        surveyId: this.survey._id,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
      });
      this.state.responseId = responseId;
      this.render();
    } catch {
      this.renderError("Failed to start survey");
    }
  }

  private render(): void {
    if (this.state.isComplete) {
      this.renderComplete();
      return;
    }

    const question = this.survey.questions[this.state.currentQuestionIndex];
    if (!question) {
      return;
    }

    const totalQuestions = this.survey.questions.length;
    const currentNum = this.state.currentQuestionIndex + 1;
    const progress = Math.round((currentNum / totalQuestions) * 100);

    this.container.innerHTML = `
      <div class="reflet-survey">
        <div class="reflet-survey-header">
          <span class="reflet-survey-title">${this.escapeHtml(this.survey.title)}</span>
          <button type="button" class="reflet-survey-close" data-action="dismiss">&times;</button>
        </div>
        <div class="reflet-survey-progress">
          <div class="reflet-survey-progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="reflet-survey-progress-text">${currentNum} of ${totalQuestions}</div>
        <div class="reflet-survey-question">
          <p class="reflet-survey-question-title">${this.escapeHtml(question.title)}${question.required ? ' <span class="reflet-required">*</span>' : ""}</p>
          ${question.description ? `<p class="reflet-survey-question-desc">${this.escapeHtml(question.description)}</p>` : ""}
          <div class="reflet-survey-input">
            ${this.renderQuestionInput(question)}
          </div>
        </div>
        <div class="reflet-survey-actions">
          ${currentNum > 1 ? '<button type="button" class="reflet-survey-btn-secondary" data-action="prev">Back</button>' : "<div></div>"}
          <button type="button" class="reflet-survey-btn-primary" data-action="next" ${this.state.isSubmitting ? "disabled" : ""}>
            ${currentNum === totalQuestions ? "Submit" : "Next"}
          </button>
        </div>
      </div>
    `;

    this.bindEvents(question);
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
    currentValue: string | number | boolean | string[] | undefined
  ): string {
    const max = question.config?.maxValue ?? 5;
    const min = question.config?.minValue ?? 1;
    const items: string[] = [];
    for (let i = min; i <= max; i++) {
      const isSelected = currentValue === i;
      items.push(
        `<button type="button" class="reflet-rating-btn ${isSelected ? "selected" : ""}" data-value="${i}">${i}</button>`
      );
    }
    const hasLabels = question.config?.minLabel || question.config?.maxLabel;
    const labels = hasLabels
      ? `<div class="reflet-rating-labels">
          <span>${this.escapeHtml(question.config?.minLabel ?? "")}</span>
          <span>${this.escapeHtml(question.config?.maxLabel ?? "")}</span>
        </div>`
      : "";
    return `<div class="reflet-rating-scale">${items.join("")}</div>${labels}`;
  }

  private renderNpsInput(
    currentValue: string | number | boolean | string[] | undefined
  ): string {
    const items: string[] = [];
    for (let i = 0; i <= 10; i++) {
      const isSelected = currentValue === i;
      items.push(
        `<button type="button" class="reflet-nps-btn ${isSelected ? "selected" : ""}" data-value="${i}">${i}</button>`
      );
    }
    return `
      <div class="reflet-nps-scale">${items.join("")}</div>
      <div class="reflet-rating-labels">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    `;
  }

  private renderTextInput(
    question: SurveyQuestion,
    currentValue: string | number | boolean | string[] | undefined
  ): string {
    const placeholder = this.escapeHtml(
      question.config?.placeholder ?? "Your answer..."
    );
    const maxLength = question.config?.maxLength ?? 1000;
    const value =
      typeof currentValue === "string" ? this.escapeHtml(currentValue) : "";
    return `<textarea class="reflet-survey-textarea" placeholder="${placeholder}" maxlength="${maxLength}" data-question="${question._id}">${value}</textarea>`;
  }

  private renderSingleChoiceInput(
    question: SurveyQuestion,
    currentValue: string | number | boolean | string[] | undefined
  ): string {
    const choices = question.config?.choices ?? [];
    return `<div class="reflet-choice-list">${choices
      .map(
        (choice) =>
          `<label class="reflet-choice-item">
            <input type="radio" name="q_${question._id}" value="${this.escapeHtml(choice)}" ${currentValue === choice ? "checked" : ""} />
            <span>${this.escapeHtml(choice)}</span>
          </label>`
      )
      .join("")}</div>`;
  }

  private renderMultipleChoiceInput(
    question: SurveyQuestion,
    currentValue: string | number | boolean | string[] | undefined
  ): string {
    const choices = question.config?.choices ?? [];
    const selectedValues = Array.isArray(currentValue) ? currentValue : [];
    return `<div class="reflet-choice-list">${choices
      .map(
        (choice) =>
          `<label class="reflet-choice-item">
            <input type="checkbox" name="q_${question._id}" value="${this.escapeHtml(choice)}" ${selectedValues.includes(choice) ? "checked" : ""} />
            <span>${this.escapeHtml(choice)}</span>
          </label>`
      )
      .join("")}</div>`;
  }

  private renderBooleanInput(
    currentValue: string | number | boolean | string[] | undefined
  ): string {
    return `
      <div class="reflet-boolean-btns">
        <button type="button" class="reflet-bool-btn ${currentValue === true ? "selected" : ""}" data-value="true">Yes</button>
        <button type="button" class="reflet-bool-btn ${currentValue === false ? "selected" : ""}" data-value="false">No</button>
      </div>
    `;
  }

  private bindEvents(question: SurveyQuestion): void {
    const container = this.container;

    container
      .querySelector('[data-action="dismiss"]')
      ?.addEventListener("click", () => {
        this.onDismiss();
      });

    container
      .querySelector('[data-action="prev"]')
      ?.addEventListener("click", () => {
        this.state.currentQuestionIndex--;
        this.render();
      });

    container
      .querySelector('[data-action="next"]')
      ?.addEventListener("click", () => {
        this.handleNext(question);
      });

    // Rating buttons
    for (const btn of container.querySelectorAll(
      ".reflet-rating-btn, .reflet-nps-btn"
    )) {
      btn.addEventListener("click", () => {
        const value = Number((btn as HTMLElement).dataset.value);
        this.state.answers.set(question._id, value);
        this.render();
      });
    }

    // Boolean buttons
    for (const btn of container.querySelectorAll(".reflet-bool-btn")) {
      btn.addEventListener("click", () => {
        const value = (btn as HTMLElement).dataset.value === "true";
        this.state.answers.set(question._id, value);
        this.render();
      });
    }

    // Text input
    const textarea = container.querySelector(".reflet-survey-textarea");
    if (textarea) {
      textarea.addEventListener("input", () => {
        this.state.answers.set(
          question._id,
          (textarea as HTMLTextAreaElement).value
        );
      });
    }

    // Radio buttons
    for (const radio of container.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][name="q_${question._id}"]`
    )) {
      radio.addEventListener("change", () => {
        this.state.answers.set(question._id, radio.value);
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
      });
    }
  }

  private async handleNext(question: SurveyQuestion): Promise<void> {
    const value = this.state.answers.get(question._id);

    if (question.required && (value === undefined || value === "")) {
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
      }

      if (this.state.currentQuestionIndex < this.survey.questions.length - 1) {
        this.state.currentQuestionIndex++;
        this.state.isSubmitting = false;
        this.render();
      } else {
        await this.api.completeSurveyResponse(this.state.responseId);
        this.state.isComplete = true;
        this.state.isSubmitting = false;
        this.render();
      }
    } catch {
      this.state.isSubmitting = false;
      this.render();
    }
  }

  private renderComplete(): void {
    this.container.innerHTML = `
      <div class="reflet-survey">
        <div class="reflet-survey-complete">
          <div class="reflet-survey-complete-icon">✓</div>
          <p class="reflet-survey-complete-title">Thank you!</p>
          <p class="reflet-survey-complete-desc">Your responses have been recorded.</p>
          <button type="button" class="reflet-survey-btn-primary" data-action="close">Done</button>
        </div>
      </div>
    `;

    this.container
      .querySelector('[data-action="close"]')
      ?.addEventListener("click", () => {
        this.onComplete();
      });
  }

  private renderError(message: string): void {
    this.container.innerHTML = `
      <div class="reflet-survey">
        <div class="reflet-error">${this.escapeHtml(message)}</div>
      </div>
    `;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
