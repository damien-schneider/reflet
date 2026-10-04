import type { PublicSurvey } from "@reflet/survey-core";
import {
  createSurveyTriggers,
  getRespondentId,
  SurveySession,
  type SurveyTransport,
  type SurveyTriggers,
} from "@reflet/survey-core/client";
import type { FeedbackApi } from "../api";
import type { SurveyCallbacks } from "../types";
import { SurveyView } from "./view";

interface OpenSurvey {
  container: HTMLElement;
  view: SurveyView;
}

const MAX_QUEUED_TRIGGER_CALLS = 50;

/**
 * Loads the surveys this respondent may see, arms their triggers and shows
 * at most one survey at a time inside the widget's shadow root.
 */
export class SurveyController {
  private readonly api: FeedbackApi;
  private readonly callbacks: SurveyCallbacks;
  private readonly getRoot: () => ShadowRoot | null;
  private surveys: PublicSurvey[] = [];
  private triggers: SurveyTriggers | null = null;
  private initialLoad: Promise<void> | null = null;
  private queuedTriggers: ((triggers: SurveyTriggers) => void)[] = [];
  private loadSequence = 0;
  private open: OpenSurvey | null = null;
  private isDestroyed = false;

  constructor(options: {
    api: FeedbackApi;
    callbacks?: SurveyCallbacks;
    getRoot: () => ShadowRoot | null;
  }) {
    this.api = options.api;
    this.callbacks = options.callbacks ?? {};
    this.getRoot = options.getRoot;
  }

  /** Fetches eligible surveys and arms their triggers. */
  start(): Promise<void> {
    this.initialLoad ??= this.load();
    return this.initialLoad;
  }

  track(eventName: string): void {
    this.withTriggers((triggers) => triggers.track(eventName));
  }

  notifyFeedbackSubmitted(): void {
    this.withTriggers((triggers) => triggers.notifyFeedbackSubmitted());
  }

  /** Shows a survey on demand (manual surveys included). Resolves false when nothing was shown. */
  async show(surveyId: string): Promise<boolean> {
    await this.initialLoad;
    if (this.open) {
      return false;
    }
    const known = this.surveys.find((survey) => survey._id === surveyId);
    const survey =
      known ??
      (await this.api
        .getActiveSurvey({ respondentId: getRespondentId(), surveyId })
        .catch(() => null));
    return survey ? this.present(survey) : false;
  }

  dismiss(): void {
    this.open?.view.dismiss();
  }

  destroy(): void {
    this.isDestroyed = true;
    this.triggers?.destroy();
    this.triggers = null;
    this.queuedTriggers = [];
    this.open?.view.dismiss();
    this.teardown();
  }

  private withTriggers(run: (triggers: SurveyTriggers) => void): void {
    if (this.isDestroyed) {
      return;
    }
    if (this.triggers) {
      run(this.triggers);
      return;
    }
    this.queuedTriggers = [...this.queuedTriggers, run].slice(
      -MAX_QUEUED_TRIGGER_CALLS
    );
  }

  private async load(): Promise<void> {
    this.loadSequence += 1;
    const sequence = this.loadSequence;
    const surveys = await this.api
      .getEligibleSurveys(getRespondentId())
      .catch(() => []);
    if (this.isDestroyed || sequence !== this.loadSequence) {
      return;
    }
    this.surveys = surveys;
    if (this.triggers) {
      this.triggers.setSurveys(surveys);
      return;
    }
    const triggers = createSurveyTriggers({
      onTrigger: (survey) => this.present(survey),
      surveys,
    });
    this.triggers = triggers;
    for (const run of this.queuedTriggers) {
      run(triggers);
    }
    this.queuedTriggers = [];
  }

  private present(survey: PublicSurvey): boolean {
    const root = this.getRoot();
    if (this.open || !root || this.isDestroyed) {
      return false;
    }
    const container = document.createElement("div");
    root.append(container);
    const session = new SurveySession({
      callbacks: {
        onAnswer: (event) => this.callbacks.onQuestionAnswer?.(event),
        onComplete: (event) => this.callbacks.onSurveyComplete?.(event),
        onDismiss: (event) => this.callbacks.onSurveyDismiss?.(event),
        onStart: (event) =>
          this.callbacks.onSurveyStart?.({ ...event, title: survey.title }),
      },
      survey,
      transport: this.transport(),
    });
    const view = new SurveyView({
      container,
      onClose: () => this.closeAndRefresh(),
      session,
    });
    this.open = { container, view };
    session.start();
    return true;
  }

  private transport(): SurveyTransport {
    return {
      answer: (input) => this.api.answerSurveyQuestion(input),
      complete: ({ responseId }) => this.api.completeSurveyResponse(responseId),
      dismiss: ({ responseId }) => this.api.dismissSurveyResponse(responseId),
      start: ({ surveyId }) =>
        this.api.startSurveyResponse({
          pageUrl: window.location.href,
          respondentId: getRespondentId(),
          surveyId,
          userAgent: navigator.userAgent,
        }),
    };
  }

  private closeAndRefresh(): void {
    this.teardown();
    if (this.triggers) {
      this.load();
    }
  }

  private teardown(): void {
    if (!this.open) {
      return;
    }
    this.open.view.destroy();
    this.open.container.remove();
    this.open = null;
  }
}
