import { answerIssue } from "./answers";
import { endingsOf, takesAnswer } from "./defaults";
import { firstStep, isEmptyAnswer, resolveNextStep, walkFrom } from "./flow";
import type {
  Answers,
  AnswerValue,
  PublicSurvey,
  SurveyEnding,
  SurveyQuestion,
} from "./types";

/** How a session talks to Reflet. `value: null` clears an answer the respondent emptied. */
export interface SurveyTransport {
  answer: (input: {
    questionId: string;
    responseId: string;
    value: AnswerValue | null;
  }) => Promise<unknown>;
  complete: (input: { responseId: string }) => Promise<unknown>;
  dismiss: (input: { responseId: string }) => Promise<unknown>;
  start: (input: { surveyId: string }) => Promise<{ responseId: string }>;
}

export interface SurveySessionCallbacks {
  onAnswer?: (event: {
    questionId: string;
    surveyId: string;
    value: AnswerValue;
  }) => void;
  onComplete?: (event: {
    endingId: string;
    responseId: string;
    surveyId: string;
  }) => void;
  onDismiss?: (event: {
    answeredCount: number;
    responseId: string | null;
    surveyId: string;
  }) => void;
  onStart?: (event: { responseId: string; surveyId: string }) => void;
}

export type SurveySessionPhase =
  | "starting"
  | "start_failed"
  | "question"
  | "ending"
  | "dismissed";

export interface SurveySessionSnapshot {
  answers: Answers;
  canGoBack: boolean;
  ending: SurveyEnding | null;
  error: string | null;
  /** The current answer leads straight to an ending, so the button submits. */
  isLastStep: boolean;
  isSubmitting: boolean;
  phase: SurveySessionPhase;
  /** 0–1, estimated along the path the current answers lead to. */
  progress: number;
  question: SurveyQuestion | null;
}

export const REQUIRED_ANSWER_MESSAGE = "This question needs an answer.";
export const SAVE_FAILED_MESSAGE = "Couldn’t save your answer. Try again.";
export const START_FAILED_MESSAGE = "Couldn’t load this survey. Try again.";

export const previewTransport: SurveyTransport = {
  answer: () => Promise.resolve(),
  complete: () => Promise.resolve(),
  dismiss: () => Promise.resolve(),
  start: () => Promise.resolve({ responseId: "preview" }),
};

export class SurveySession {
  readonly survey: PublicSurvey;
  private readonly transport: SurveyTransport;
  private readonly callbacks: SurveySessionCallbacks;
  private readonly endings: SurveyEnding[];
  private readonly listeners = new Set<() => void>();
  private readonly submitted = new Set<string>();
  private history: SurveyQuestion[] = [];
  private answers: Map<string, AnswerValue> = new Map();
  private current: SurveyQuestion | null = null;
  private ending: SurveyEnding | null = null;
  private error: string | null = null;
  private isSubmitting = false;
  private phase: SurveySessionPhase = "starting";
  private responseId: string | null = null;
  private snapshot: SurveySessionSnapshot;

  constructor(options: {
    callbacks?: SurveySessionCallbacks;
    survey: PublicSurvey;
    transport: SurveyTransport;
  }) {
    this.survey = options.survey;
    this.transport = options.transport;
    this.callbacks = options.callbacks ?? {};
    this.endings = endingsOf(options.survey.endings);
    this.snapshot = this.buildSnapshot();
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): SurveySessionSnapshot => this.snapshot;

  /** A method, not a field read, so TS doesn't narrow `phase` across awaits. */
  private isDismissed(): boolean {
    return this.phase === "dismissed";
  }

  async start(): Promise<void> {
    if (this.phase !== "starting" && this.phase !== "start_failed") {
      return;
    }
    this.update({ error: null, phase: "starting" });
    try {
      const { responseId } = await this.transport.start({
        surveyId: this.survey._id,
      });
      this.responseId = responseId;
      if (this.isDismissed()) {
        this.transport.dismiss({ responseId }).catch(() => undefined);
        return;
      }
      this.callbacks.onStart?.({ responseId, surveyId: this.survey._id });
      const step = firstStep(this.survey.questions, this.endings);
      if (step.kind === "question") {
        this.current = step.question;
        this.update({ phase: "question" });
      } else {
        await this.finish(step.ending);
      }
    } catch {
      if (!this.isDismissed()) {
        this.update({ error: START_FAILED_MESSAGE, phase: "start_failed" });
      }
    }
  }

  setAnswer(value: AnswerValue | undefined): void {
    if (!this.current || this.phase !== "question") {
      return;
    }
    const answers = new Map(this.answers);
    if (value === undefined) {
      answers.delete(this.current._id);
    } else {
      answers.set(this.current._id, value);
    }
    this.answers = answers;
    this.update({ error: null });
  }

  async next(): Promise<void> {
    const question = this.current;
    const responseId = this.responseId;
    if (!(question && responseId) || this.isSubmitting) {
      return;
    }
    const value = this.answers.get(question._id);
    const validationError = this.validate(question, value);
    if (validationError) {
      this.update({ error: validationError });
      return;
    }
    this.update({ error: null, isSubmitting: true });
    try {
      await this.saveAnswer(question, responseId, value);
      if (this.isDismissed()) {
        return;
      }
      const step = resolveNextStep(
        this.survey.questions,
        question,
        value,
        this.endings
      );
      if (step.kind === "question") {
        this.history = [...this.history, question];
        this.current = step.question;
        this.update({ isSubmitting: false });
      } else {
        await this.finish(step.ending);
      }
    } catch {
      if (!this.isDismissed()) {
        this.update({ error: SAVE_FAILED_MESSAGE, isSubmitting: false });
      }
    }
  }

  back(): void {
    const previous = this.history.at(-1);
    if (!previous || this.isSubmitting || this.phase !== "question") {
      return;
    }
    this.history = this.history.slice(0, -1);
    this.current = previous;
    this.update({ error: null });
  }

  dismiss(): void {
    if (this.phase === "dismissed") {
      return;
    }
    const closesAfterEnding = this.phase === "ending";
    if (this.phase === "question" && this.responseId) {
      this.transport
        .dismiss({ responseId: this.responseId })
        .catch(() => undefined);
    }
    if (!closesAfterEnding) {
      this.callbacks.onDismiss?.({
        answeredCount: this.submitted.size,
        responseId: this.responseId,
        surveyId: this.survey._id,
      });
    }
    this.update({ phase: "dismissed" });
  }

  private validate(
    question: SurveyQuestion,
    value: AnswerValue | undefined
  ): string | null {
    if (!takesAnswer(question.type)) {
      return null;
    }
    if (value === undefined || isEmptyAnswer(value)) {
      return question.required ? REQUIRED_ANSWER_MESSAGE : null;
    }
    return answerIssue(question, value);
  }

  private async saveAnswer(
    question: SurveyQuestion,
    responseId: string,
    value: AnswerValue | undefined
  ): Promise<void> {
    if (!takesAnswer(question.type)) {
      return;
    }
    if (value !== undefined && !isEmptyAnswer(value)) {
      await this.transport.answer({
        questionId: question._id,
        responseId,
        value,
      });
      this.submitted.add(question._id);
      this.callbacks.onAnswer?.({
        questionId: question._id,
        surveyId: this.survey._id,
        value,
      });
      return;
    }
    if (this.submitted.has(question._id)) {
      await this.transport.answer({
        questionId: question._id,
        responseId,
        value: null,
      });
      this.submitted.delete(question._id);
    }
  }

  private async finish(ending: SurveyEnding): Promise<void> {
    const responseId = this.responseId;
    if (!responseId) {
      return;
    }
    await this.transport.complete({ responseId });
    if (this.isDismissed()) {
      return;
    }
    this.ending = ending;
    this.current = null;
    this.update({ isSubmitting: false, phase: "ending" });
    this.callbacks.onComplete?.({
      endingId: ending.id,
      responseId,
      surveyId: this.survey._id,
    });
  }

  private update(patch: {
    error?: string | null;
    isSubmitting?: boolean;
    phase?: SurveySessionPhase;
  }): void {
    if (patch.error !== undefined) {
      this.error = patch.error;
    }
    if (patch.isSubmitting !== undefined) {
      this.isSubmitting = patch.isSubmitting;
    }
    if (patch.phase !== undefined) {
      this.phase = patch.phase;
    }
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private buildSnapshot(): SurveySessionSnapshot {
    const question = this.phase === "question" ? this.current : null;
    const answered = this.history.length;
    const remaining = question
      ? walkFrom(
          this.survey.questions,
          { kind: "question", question },
          this.answers,
          this.endings
        ).questions.length
      : 0;
    const isLastStep = question
      ? resolveNextStep(
          this.survey.questions,
          question,
          this.answers.get(question._id),
          this.endings
        ).kind === "ending"
      : false;
    return {
      answers: this.answers,
      canGoBack: question !== null && answered > 0,
      ending: this.phase === "ending" ? this.ending : null,
      error: this.error,
      isLastStep,
      isSubmitting: this.isSubmitting,
      phase: this.phase,
      progress:
        this.phase === "ending" ? 1 : answered / (answered + remaining || 1),
      question,
    };
  }
}
