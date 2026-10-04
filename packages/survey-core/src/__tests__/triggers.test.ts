import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSurveyTriggers, type SurveyTriggers } from "../triggers";
import type { PublicSurvey, TriggerConfig, TriggerType } from "../types";

const survey = (
  id: string,
  triggerType: TriggerType,
  triggerConfig?: TriggerConfig
): PublicSurvey => ({
  _id: id,
  display: { frequency: "once" },
  endings: [],
  questions: [],
  title: id,
  triggerConfig,
  triggerType,
});

let triggers: SurveyTriggers | null = null;

const arm = (surveys: PublicSurvey[], accept = () => true) => {
  triggers?.destroy();
  const fired: string[] = [];
  triggers = createSurveyTriggers({
    onTrigger: (candidate) => {
      const accepted = accept();
      if (accepted) {
        fired.push(candidate._id);
      }
      return accepted;
    },
    surveys,
  });
  return fired;
};

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  triggers?.destroy();
  triggers = null;
  vi.useRealTimers();
});

describe("createSurveyTriggers", () => {
  it("shows page-visit surveys only on matching pages, including after client navigation", () => {
    const fired = arm([
      survey("pricing", "page_visit", { pageUrl: "/pricing" }),
    ]);
    expect(fired).toEqual([]);

    window.history.pushState({}, "", "/pricing");
    vi.advanceTimersByTime(1000);
    expect(fired).toEqual(["pricing"]);

    window.history.pushState({}, "", "/");
    window.history.pushState({}, "", "/pricing");
    vi.advanceTimersByTime(1000);
    expect(fired).toEqual(["pricing"]);
  });

  it("waits the configured delay and cancels it when the visitor navigates away", () => {
    const fired = arm([
      survey("slow", "time_delay", { delayMs: 3000, pageUrl: "/" }),
    ]);
    vi.advanceTimersByTime(2999);
    expect(fired).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(fired).toEqual(["slow"]);

    const again = arm([
      survey("left", "time_delay", { delayMs: 3000, pageUrl: "/" }),
    ]);
    window.history.pushState({}, "", "/elsewhere");
    vi.advanceTimersByTime(5000);
    expect(again).toEqual([]);
  });

  it("fires event surveys on their own event name only", () => {
    const fired = arm([
      survey("upgrade", "event", { eventName: "upgraded" }),
      survey("manual", "manual"),
    ]);
    triggers?.track("downgraded");
    triggers?.track("upgraded");
    expect(fired).toEqual(["upgrade"]);
  });

  it("fires exit-intent surveys when the pointer leaves through the top", () => {
    const fired = arm([survey("exit", "exit_intent")]);
    document.dispatchEvent(
      new MouseEvent("mouseout", { clientY: 200, relatedTarget: null })
    );
    expect(fired).toEqual([]);
    document.dispatchEvent(
      new MouseEvent("mouseout", { clientY: 0, relatedTarget: null })
    );
    expect(fired).toEqual(["exit"]);
  });

  it("keeps a survey armed when the host is busy and fires it on the next chance", () => {
    let busy = true;
    const fired = arm(
      [survey("after-feedback", "feedback_submitted")],
      () => !busy
    );
    triggers?.notifyFeedbackSubmitted();
    expect(fired).toEqual([]);
    busy = false;
    triggers?.notifyFeedbackSubmitted();
    triggers?.notifyFeedbackSubmitted();
    expect(fired).toEqual(["after-feedback"]);
  });
});
