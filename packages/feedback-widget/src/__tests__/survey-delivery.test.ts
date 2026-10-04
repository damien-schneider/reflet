import { afterEach, describe, expect, it, vi } from "vitest";
import type { RefletFeedbackWidget } from "../widget";
import {
  buildQuestion,
  buildSurvey,
  click,
  mockRefletApi,
  mountWidget,
  surveyDialog,
  visibleQuestionTitle,
} from "./survey-harness";

let mounted: RefletFeedbackWidget | null = null;

const mount = async (...args: Parameters<typeof mountWidget>) => {
  const result = await mountWidget(...args);
  mounted = result.widget;
  return result;
};

afterEach(() => {
  mounted?.destroy();
  mounted = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  localStorage.clear();
  history.replaceState(null, "", "/");
});

const pricingSurvey = buildSurvey({
  _id: "survey_pricing",
  questions: [
    buildQuestion("q_price", "boolean", 0, { title: "Is pricing clear?" }),
  ],
  triggerConfig: { pageUrl: "/pricing" },
});

const everyPageSurvey = buildSurvey({
  _id: "survey_everywhere",
  questions: [buildQuestion("q_any", "text", 0, { title: "Anything to add?" })],
});

describe("in-app survey delivery", () => {
  it("shows a page-visit survey on a matching page, one survey at a time", async () => {
    history.replaceState(null, "", "/pricing");
    const api = mockRefletApi({ surveys: [pricingSurvey, everyPageSurvey] });
    const { root } = await mount();

    await vi.waitFor(() =>
      expect(visibleQuestionTitle(root)).toBe("Is pricing clear?")
    );
    expect(root.querySelectorAll(".reflet-survey")).toHaveLength(1);
    const respondentId = localStorage.getItem("reflet:respondent-id");
    expect(respondentId).toBeTruthy();
    const eligible = api.calls.find(
      (call) => call.path === "/api/v1/surveys/eligible"
    );
    expect(eligible?.search).toBe(`?respondentId=${respondentId}`);
    expect(
      api.calls.find((call) => call.path === "/api/v1/surveys/respond/start")
        ?.body
    ).toMatchObject({ respondentId, surveyId: "survey_pricing" });
  });

  it("leaves page-visit surveys for other pages alone", async () => {
    history.replaceState(null, "", "/docs");
    mockRefletApi({ surveys: [pricingSurvey] });
    const { root, widget } = await mount();

    await expect(widget.showSurvey("survey_missing")).resolves.toBe(false);
    expect(surveyDialog(root)).toBeNull();
  });

  it("shows an event survey when the app tracks that event", async () => {
    const checkoutSurvey = buildSurvey({
      _id: "survey_checkout",
      questions: [
        buildQuestion("q_checkout", "rating", 0, {
          title: "How was checkout?",
        }),
      ],
      triggerConfig: { eventName: "checkout_completed" },
      triggerType: "event",
    });
    mockRefletApi({ surveys: [checkoutSurvey] });
    const { root, widget } = await mount();

    widget.track("signed_up");
    widget.track("checkout_completed");

    await vi.waitFor(() =>
      expect(visibleQuestionTitle(root)).toBe("How was checkout?")
    );
  });

  it("keeps events tracked before the widget finishes loading", async () => {
    const signupSurvey = buildSurvey({
      _id: "survey_signup",
      questions: [
        buildQuestion("q_signup", "text", 0, { title: "Why did you sign up?" }),
      ],
      triggerConfig: { eventName: "signup" },
      triggerType: "event",
    });
    mockRefletApi({ surveys: [signupSurvey] });
    const { root } = await mount({}, (widget) => widget.track("signup"));

    await vi.waitFor(() =>
      expect(visibleQuestionTitle(root)).toBe("Why did you sign up?")
    );
  });

  it("records an open survey as dismissed when the widget is destroyed", async () => {
    history.replaceState(null, "", "/pricing");
    const api = mockRefletApi({ surveys: [pricingSurvey] });
    const onSurveyDismiss = vi.fn();
    const { root, widget } = await mount({ survey: { onSurveyDismiss } });
    await vi.waitFor(() =>
      expect(visibleQuestionTitle(root)).toBe("Is pricing clear?")
    );

    widget.destroy();
    mounted = null;

    await vi.waitFor(() =>
      expect(api.surveyPaths()).toContain("/api/v1/surveys/respond/dismiss")
    );
    expect(onSurveyDismiss).toHaveBeenCalledWith({
      answeredCount: 0,
      responseId: "resp_1",
      surveyId: "survey_pricing",
    });
    expect(api.surveyPaths()).toEqual([
      "/api/v1/surveys/eligible",
      "/api/v1/surveys/respond/start",
      "/api/v1/surveys/respond/dismiss",
    ]);
  });

  it("shows a manual survey only when asked, falling back to the active endpoint", async () => {
    const manualSurvey = buildSurvey({
      _id: "survey_manual",
      questions: [buildQuestion("q_manual", "nps", 0, { title: "Recommend?" })],
      triggerType: "manual",
    });
    const unlistedSurvey = buildSurvey({
      _id: "survey_unlisted",
      questions: [buildQuestion("q_unlisted", "text", 0, { title: "Hi?" })],
      triggerType: "manual",
    });
    const api = mockRefletApi({
      active: unlistedSurvey,
      surveys: [manualSurvey],
    });
    const { root, widget } = await mount();

    await expect(widget.showSurvey("survey_manual")).resolves.toBe(true);
    await vi.waitFor(() =>
      expect(visibleQuestionTitle(root)).toBe("Recommend?")
    );
    await expect(widget.showSurvey("survey_unlisted")).resolves.toBe(false);

    widget.dismissSurvey();
    await vi.waitFor(() => expect(surveyDialog(root)).toBeNull());
    await expect(widget.showSurvey("survey_unlisted")).resolves.toBe(true);
    await vi.waitFor(() => expect(visibleQuestionTitle(root)).toBe("Hi?"));
    expect(
      api.calls.find((call) => call.path === "/api/v1/surveys/active")?.search
    ).toContain("surveyId=survey_unlisted");
  });

  it("posts the dismissal and refreshes eligible surveys when the respondent closes it", async () => {
    history.replaceState(null, "", "/pricing");
    const api = mockRefletApi({ surveys: [pricingSurvey] });
    const { root } = await mount();
    await vi.waitFor(() => expect(visibleQuestionTitle(root)).not.toBeNull());

    click(root, '[data-action="dismiss"]');

    await vi.waitFor(() =>
      expect(api.surveyPaths()).toEqual([
        "/api/v1/surveys/eligible",
        "/api/v1/surveys/respond/start",
        "/api/v1/surveys/respond/dismiss",
        "/api/v1/surveys/eligible",
      ])
    );
    expect(
      api.calls.find((call) => call.path === "/api/v1/surveys/respond/dismiss")
        ?.body
    ).toEqual({ responseId: "resp_1" });
    expect(surveyDialog(root)).toBeNull();
  });

  it("dismisses with Escape", async () => {
    history.replaceState(null, "", "/pricing");
    const api = mockRefletApi({ surveys: [pricingSurvey] });
    const { root } = await mount();
    await vi.waitFor(() => expect(visibleQuestionTitle(root)).not.toBeNull());

    surveyDialog(root)?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })
    );

    await vi.waitFor(() =>
      expect(api.surveyPaths()).toContain("/api/v1/surveys/respond/dismiss")
    );
    expect(surveyDialog(root)).toBeNull();
  });

  it("shows surveys for a private organization whose feedback board is hidden", async () => {
    history.replaceState(null, "", "/pricing");
    mockRefletApi({ isBoardPrivate: true, surveys: [pricingSurvey] });
    const { root } = await mount();

    await vi.waitFor(() =>
      expect(visibleQuestionTitle(root)).toBe("Is pricing clear?")
    );
    expect(root.querySelector(".reflet-feedback-container")).toBeNull();
  });

  it("never fetches surveys when surveys are turned off", async () => {
    history.replaceState(null, "", "/pricing");
    const api = mockRefletApi({ surveys: [pricingSurvey] });
    const { root, widget } = await mount({ features: { surveys: false } });

    widget.track("checkout_completed");

    expect(api.calls.map((call) => call.path)).toEqual([
      "/api/v1/feedback",
      "/api/v1/feedback/list",
    ]);
    expect(surveyDialog(root)).toBeNull();
  });
});
