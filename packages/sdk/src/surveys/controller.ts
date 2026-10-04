import type { PublicSurvey } from "@reflet/survey-core";
import {
  createSurveyTriggers,
  SurveySession,
  type SurveySessionCallbacks,
  type SurveyTriggers,
} from "@reflet/survey-core/client";
import { DEFAULT_API_URL, type Reflet } from "../client";
import { createRefletSurveyTransport } from "./client-transport";
import { surveyControllers, surveyRegistryKey } from "./registry";

type PendingCall =
  | { eventName: string; kind: "track" }
  | { kind: "feedback_submitted" }
  | { kind: "show"; surveyId: string };

export interface RefletSurveysCallbacks {
  onSurveyAnswer?: SurveySessionCallbacks["onAnswer"];
  onSurveyComplete?: SurveySessionCallbacks["onComplete"];
  onSurveyDismiss?: SurveySessionCallbacks["onDismiss"];
  onSurveyStart?: SurveySessionCallbacks["onStart"];
}

const MAX_PENDING_CALLS = 50;

/**
 * Owns in-app delivery for one Reflet project: eligible surveys, armed
 * triggers and the survey on screen. Lives outside React so signals sent
 * before `<RefletSurveys />` has loaded surveys are queued, not lost.
 */
export class SurveyController {
  callbacks: RefletSurveysCallbacks = {};
  private active: SurveySession | null = null;
  private client: Reflet | null = null;
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  private pending: PendingCall[] = [];
  private surveys: PublicSurvey[] | null = null;
  private triggers: SurveyTriggers | null = null;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getActiveSession = (): SurveySession | null => this.active;

  attach(client: Reflet): () => void {
    this.generation += 1;
    const generation = this.generation;
    this.client = client;
    this.triggers = createSurveyTriggers({
      onTrigger: (survey) => this.activate(survey),
      surveys: [],
    });
    this.refresh();
    return () => {
      if (generation !== this.generation) {
        return;
      }
      this.generation += 1;
      this.triggers?.destroy();
      this.triggers = null;
      this.client = null;
      this.surveys = null;
      this.active?.dismiss();
      this.setActive(null);
    };
  }

  track(eventName: string): void {
    if (this.triggers && this.surveys) {
      this.triggers.track(eventName);
      return;
    }
    this.enqueue({ eventName, kind: "track" });
  }

  notifyFeedbackSubmitted(): void {
    if (this.triggers && this.surveys) {
      this.triggers.notifyFeedbackSubmitted();
      return;
    }
    this.enqueue({ kind: "feedback_submitted" });
  }

  showSurvey(surveyId: string): void {
    if (!this.surveys) {
      this.enqueue({ kind: "show", surveyId });
      return;
    }
    const survey = this.surveys.find((candidate) => candidate._id === surveyId);
    if (survey) {
      this.activate(survey);
    }
  }

  dismissSurvey(): void {
    this.active?.dismiss();
  }

  private async refresh(): Promise<void> {
    const client = this.client;
    const generation = this.generation;
    if (!client) {
      return;
    }
    let surveys: PublicSurvey[];
    try {
      surveys = await client.getEligibleSurveys();
    } catch {
      surveys = [];
    }
    if (generation !== this.generation) {
      return;
    }
    this.surveys = surveys;
    this.triggers?.setSurveys(surveys);
    const pending = this.pending;
    this.pending = [];
    for (const call of pending) {
      if (call.kind === "track") {
        this.track(call.eventName);
      } else if (call.kind === "feedback_submitted") {
        this.notifyFeedbackSubmitted();
      } else {
        this.showSurvey(call.surveyId);
      }
    }
  }

  private enqueue(call: PendingCall): void {
    this.pending = [...this.pending, call].slice(-MAX_PENDING_CALLS);
  }

  private activate(survey: PublicSurvey): boolean {
    const client = this.client;
    if (this.active || !client) {
      return false;
    }
    const session = new SurveySession({
      callbacks: {
        onAnswer: (event) => this.callbacks.onSurveyAnswer?.(event),
        onComplete: (event) => this.callbacks.onSurveyComplete?.(event),
        onDismiss: (event) => this.callbacks.onSurveyDismiss?.(event),
        onStart: (event) => this.callbacks.onSurveyStart?.(event),
      },
      survey,
      transport: createRefletSurveyTransport(client),
    });
    const unsubscribe = session.subscribe(() => {
      if (session.getSnapshot().phase !== "dismissed") {
        return;
      }
      unsubscribe();
      if (this.active === session) {
        this.setActive(null);
        this.refresh();
      }
    });
    this.setActive(session);
    session.start().then(() => {
      const failed = session.getSnapshot().phase === "start_failed";
      if (failed && this.active === session) {
        unsubscribe();
        this.setActive(null);
      }
    });
    return true;
  }

  private setActive(session: SurveySession | null): void {
    this.active = session;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** Shared by `<RefletSurveys />`, `useRefletSurveys()` and the client's feedback signal. */
export const surveyControllerFor = (
  publicKey: string,
  baseUrl: string | undefined
): SurveyController => {
  const key = surveyRegistryKey(publicKey, baseUrl ?? DEFAULT_API_URL);
  let controller = surveyControllers.get(key);
  if (!controller) {
    controller = new SurveyController();
    surveyControllers.set(key, controller);
  }
  return controller;
};
