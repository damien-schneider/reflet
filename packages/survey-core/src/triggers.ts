import { DEFAULT_TIME_DELAY_MS } from "./defaults";
import { matchesPageUrl } from "./targeting";
import type { PublicSurvey } from "./types";

const URL_POLL_INTERVAL_MS = 1000;

export interface SurveyTriggers {
  destroy: () => void;
  notifyFeedbackSubmitted: () => void;
  setSurveys: (surveys: readonly PublicSurvey[]) => void;
  track: (eventName: string) => void;
}

export interface SurveyTriggerOptions {
  /** Return false when the survey can't be shown now; it stays armed. */
  onTrigger: (survey: PublicSurvey) => boolean;
  surveys: readonly PublicSurvey[];
  window?: Window;
}

/**
 * Arms every survey's trigger on the page: page visits (including client-side
 * navigation), time on page, exit intent, custom events and submitted feedback.
 * Each survey fires at most once per page session.
 */
export const createSurveyTriggers = (
  options: SurveyTriggerOptions
): SurveyTriggers => {
  const win = options.window ?? window;
  const fired = new Set<string>();
  const timers = new Map<string, number>();
  let surveys = options.surveys;
  let lastHref = win.location.href;

  const onCurrentPage = (survey: PublicSurvey) =>
    matchesPageUrl(survey.triggerConfig?.pageUrl, win.location.href);

  const fire = (survey: PublicSurvey) => {
    if (fired.has(survey._id) || !onCurrentPage(survey)) {
      return;
    }
    if (options.onTrigger(survey)) {
      fired.add(survey._id);
    }
  };

  const clearTimers = () => {
    for (const timer of timers.values()) {
      win.clearTimeout(timer);
    }
    timers.clear();
  };

  const armPage = () => {
    clearTimers();
    for (const survey of surveys) {
      if (fired.has(survey._id) || !onCurrentPage(survey)) {
        continue;
      }
      if (survey.triggerType === "page_visit") {
        fire(survey);
      }
      if (survey.triggerType === "time_delay") {
        const delayMs = survey.triggerConfig?.delayMs ?? DEFAULT_TIME_DELAY_MS;
        timers.set(
          survey._id,
          win.setTimeout(() => fire(survey), delayMs)
        );
      }
    }
  };

  const fireAll = (matches: (survey: PublicSurvey) => boolean) => {
    for (const survey of surveys) {
      if (matches(survey)) {
        fire(survey);
      }
    }
  };

  const onMouseOut = (event: MouseEvent) => {
    const leftThroughTop = event.relatedTarget === null && event.clientY <= 0;
    if (leftThroughTop) {
      fireAll((survey) => survey.triggerType === "exit_intent");
    }
  };

  const onNavigation = () => {
    if (win.location.href === lastHref) {
      return;
    }
    lastHref = win.location.href;
    armPage();
  };

  win.document.addEventListener("mouseout", onMouseOut);
  win.addEventListener("popstate", onNavigation);
  win.addEventListener("hashchange", onNavigation);
  const urlPoll = win.setInterval(onNavigation, URL_POLL_INTERVAL_MS);
  armPage();

  return {
    destroy: () => {
      clearTimers();
      win.clearInterval(urlPoll);
      win.document.removeEventListener("mouseout", onMouseOut);
      win.removeEventListener("popstate", onNavigation);
      win.removeEventListener("hashchange", onNavigation);
    },
    notifyFeedbackSubmitted: () =>
      fireAll((survey) => survey.triggerType === "feedback_submitted"),
    setSurveys: (next) => {
      surveys = next;
      armPage();
    },
    track: (eventName) =>
      fireAll(
        (survey) =>
          survey.triggerType === "event" &&
          survey.triggerConfig?.eventName === eventName
      ),
  };
};
