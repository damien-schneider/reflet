import type { PublicSurvey } from "@reflet/survey-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RefletFeedbackWidget } from "../widget";
import {
  buildQuestion,
  buildSurvey,
  click,
  type MockedRefletApi,
  mockRefletApi,
  mountWidget,
  optionLabelled,
  surveyDialog,
  typeInto,
  visibleQuestionTitle,
} from "./survey-harness";

let mounted: RefletFeedbackWidget | null = null;

const showSurvey = async (survey: PublicSurvey) => {
  const api = mockRefletApi({ surveys: [survey] });
  const { root, widget } = await mountWidget();
  mounted = widget;
  await vi.waitFor(() => expect(visibleQuestionTitle(root)).not.toBeNull());
  return { api, root };
};

const answerBodies = (api: MockedRefletApi) =>
  api.calls
    .filter((call) => call.path === "/api/v1/surveys/respond/answer")
    .map((call) => call.body);

afterEach(() => {
  mounted?.destroy();
  mounted = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("survey flow in the widget", () => {
  it("follows an NPS branch to its follow-up question and ending", async () => {
    const { api, root } = await showSurvey(
      buildSurvey({
        _id: "survey_nps",
        display: { frequency: "once", position: "center" },
        endings: [
          { id: "promoter", title: "Thanks, fan!" },
          {
            description: "We will follow up soon.",
            id: "detractor",
            title: "We hear you",
          },
        ],
        questions: [
          buildQuestion("q_nps", "nps", 0, {
            logic: [
              {
                id: "rule_low",
                operator: "less_than",
                target: { kind: "question", questionId: "q_fix" },
                value: 7,
              },
            ],
            required: true,
            title: "How likely are you to recommend us?",
          }),
          buildQuestion("q_love", "text", 1, {
            next: { endingId: "promoter", kind: "ending" },
            title: "What do you love?",
          }),
          buildQuestion("q_fix", "text", 2, {
            next: { endingId: "detractor", kind: "ending" },
            title: "What should we fix?",
          }),
        ],
      })
    );
    expect(surveyDialog(root)?.getAttribute("aria-modal")).toBe("true");
    expect(root.querySelector(".reflet-survey-backdrop")).not.toBeNull();

    optionLabelled(root, "3 out of 10").click();
    await vi.waitFor(() =>
      expect(visibleQuestionTitle(root)).toBe("What should we fix?")
    );
    expect(root.querySelector("[data-primary]")?.textContent).toBe("Submit");

    typeInto(root.querySelector("textarea"), "Faster exports");
    expect(root.querySelector(".reflet-char-count")?.textContent).toBe(
      "14/1000"
    );
    click(root, '[data-action="next"]');

    await vi.waitFor(() =>
      expect(
        root.querySelector(".reflet-survey-complete-title")?.textContent
      ).toBe("We hear you")
    );
    expect(
      root.querySelector(".reflet-survey-complete-desc")?.textContent
    ).toBe("We will follow up soon.");
    expect(api.surveyPaths()).toEqual([
      "/api/v1/surveys/eligible",
      "/api/v1/surveys/respond/start",
      "/api/v1/surveys/respond/answer",
      "/api/v1/surveys/respond/answer",
      "/api/v1/surveys/respond/complete",
    ]);
    expect(answerBodies(api)).toEqual([
      { questionId: "q_nps", responseId: "resp_1", value: 3 },
      { questionId: "q_fix", responseId: "resp_1", value: "Faster exports" },
    ]);
  });

  it("goes back to the question the respondent actually visited", async () => {
    const { root } = await showSurvey(
      buildSurvey({
        _id: "survey_back",
        questions: [
          buildQuestion("q_tried", "boolean", 0, {
            logic: [
              {
                id: "rule_no",
                operator: "equals",
                target: { kind: "question", questionId: "q_why_not" },
                value: false,
              },
            ],
            title: "Have you tried exports?",
          }),
          buildQuestion("q_how", "text", 1, { title: "How did it go?" }),
          buildQuestion("q_why_not", "text", 2, { title: "Why not?" }),
        ],
      })
    );
    expect(
      root.querySelector<HTMLElement>('[data-action="back"]')?.hidden
    ).toBe(true);

    optionLabelled(root, "No").click();
    await vi.waitFor(() => expect(visibleQuestionTitle(root)).toBe("Why not?"));
    click(root, '[data-action="back"]');

    expect(visibleQuestionTitle(root)).toBe("Have you tried exports?");
    expect(optionLabelled(root, "No").getAttribute("aria-checked")).toBe(
      "true"
    );
  });

  it("submits the typed text when the respondent picks Other", async () => {
    const { api, root } = await showSurvey(
      buildSurvey({
        _id: "survey_other",
        questions: [
          buildQuestion("q_source", "single_choice", 0, {
            config: { allowOther: true, choices: ["Search", "A friend"] },
            required: true,
            title: "Where did you hear about us?",
          }),
        ],
      })
    );
    const otherInput = root.querySelector<HTMLInputElement>(
      "[data-other-answer]"
    );
    expect(otherInput?.hidden).toBe(true);

    optionLabelled(root, "Other").click();
    expect(otherInput?.hidden).toBe(false);
    typeInto(otherInput, "A podcast");
    click(root, '[data-action="next"]');

    await vi.waitFor(() =>
      expect(api.surveyPaths()).toContain("/api/v1/surveys/respond/complete")
    );
    expect(answerBodies(api)).toEqual([
      { questionId: "q_source", responseId: "resp_1", value: "A podcast" },
    ]);
  });

  it("renders a statement's link button and the ending's own button", async () => {
    const { api, root } = await showSurvey(
      buildSurvey({
        _id: "survey_statement",
        endings: [
          {
            buttonLabel: "See the changelog",
            buttonUrl: "https://reflet.app/changelog",
            id: "end_changelog",
            title: "You're all set",
          },
        ],
        questions: [
          buildQuestion("q_intro", "statement", 0, {
            config: {
              buttonLabel: "Read the guide",
              buttonUrl: "https://docs.reflet.app/guide",
            },
            description: "We shipped a new editor.",
            title: "Big news",
          }),
        ],
      })
    );
    expect(
      root.querySelector(".reflet-survey-question-desc")?.textContent
    ).toBe("We shipped a new editor.");
    const guideLink = root.querySelector<HTMLAnchorElement>("a[data-primary]");
    expect(guideLink?.textContent).toBe("Read the guide");
    expect(guideLink?.href).toBe("https://docs.reflet.app/guide");
    expect(guideLink?.target).toBe("_blank");
    expect(guideLink?.rel).toContain("noopener");

    guideLink?.addEventListener("click", (event) => event.preventDefault());
    guideLink?.click();

    await vi.waitFor(() =>
      expect(
        root.querySelector(".reflet-survey-complete-title")?.textContent
      ).toBe("You're all set")
    );
    const endingLink = root.querySelector<HTMLAnchorElement>("a[data-primary]");
    expect(endingLink?.textContent).toBe("See the changelog");
    expect(endingLink?.href).toBe("https://reflet.app/changelog");
    expect(answerBodies(api)).toEqual([]);
  });

  it("never turns a non-http button url into a link", async () => {
    const { root } = await showSurvey(
      buildSurvey({
        _id: "survey_hostile",
        questions: [
          buildQuestion("q_intro", "statement", 0, {
            config: { buttonLabel: "Go", buttonUrl: "javascript:alert(1)" },
            title: "Hello",
          }),
        ],
      })
    );
    expect(root.querySelector("a")).toBeNull();
    expect(root.querySelector("button[data-primary]")?.textContent).toBe("Go");
  });
});
