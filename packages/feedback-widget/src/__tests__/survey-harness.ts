import type {
  PublicSurvey,
  QuestionType,
  SurveyQuestion,
} from "@reflet/survey-core";
import { vi } from "vitest";
import type { WidgetConfig } from "../types";
import { RefletFeedbackWidget } from "../widget";

export interface RecordedCall {
  body: unknown;
  method: string;
  path: string;
  search: string;
}

export interface MockedRefletApi {
  calls: RecordedCall[];
  surveyPaths: () => string[];
}

const BOARD_CONFIG = {
  id: "board_1",
  name: "Board",
  organization: { id: "org_1", name: "Acme" },
  slug: "board",
  statuses: [],
};

export const buildQuestion = (
  id: string,
  type: QuestionType,
  order: number,
  overrides: Partial<SurveyQuestion> = {}
): SurveyQuestion => ({
  _id: id,
  order,
  required: false,
  title: `Question ${id}`,
  type,
  ...overrides,
});

export const buildSurvey = (
  overrides: Partial<PublicSurvey> & Pick<PublicSurvey, "_id" | "questions">
): PublicSurvey => ({
  display: { frequency: "once", position: "bottom_right" },
  endings: [],
  title: "Quick question",
  triggerType: "page_visit",
  ...overrides,
});

const routeResponse = (
  path: string,
  options: { active: PublicSurvey | null; surveys: PublicSurvey[] }
): unknown => {
  switch (path) {
    case "/api/v1/feedback":
      return BOARD_CONFIG;
    case "/api/v1/feedback/list":
      return { hasMore: false, items: [], total: 0 };
    case "/api/v1/surveys/eligible":
      return { surveys: options.surveys };
    case "/api/v1/surveys/active":
      return options.active;
    case "/api/v1/surveys/respond/start":
      return { responseId: "resp_1" };
    case "/api/v1/surveys/respond/answer":
      return { answerId: "answer_1" };
    case "/api/v1/surveys/respond/complete":
      return { endingId: "ignored", success: true };
    case "/api/v1/surveys/respond/dismiss":
      return { success: true };
    default:
      return { error: `Unexpected ${path}` };
  }
};

/** Stubs `fetch` with an in-memory Reflet API and records every request. */
export const mockRefletApi = (options: {
  active?: PublicSurvey | null;
  isBoardPrivate?: boolean;
  surveys: PublicSurvey[];
}): MockedRefletApi => {
  const calls: RecordedCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      calls.push({
        body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
        method: init?.method ?? "GET",
        path: url.pathname,
        search: url.search,
      });
      if (options.isBoardPrivate && url.pathname === "/api/v1/feedback") {
        return Promise.resolve(
          Response.json(
            { error: "This organization is not public" },
            { status: 403 }
          )
        );
      }
      return Promise.resolve(
        Response.json(
          routeResponse(url.pathname, {
            active: options.active ?? null,
            surveys: options.surveys,
          })
        )
      );
    })
  );
  return {
    calls,
    surveyPaths: () =>
      calls
        .map((call) => call.path)
        .filter((path) => path.startsWith("/api/v1/surveys")),
  };
};

/** Mounts the widget and returns its (closed) shadow root so tests can see what respondents see. */
export const mountWidget = async (
  config: Partial<WidgetConfig> = {},
  whileInitializing?: (widget: RefletFeedbackWidget) => void
) => {
  const roots: ShadowRoot[] = [];
  const attachShadow = Element.prototype.attachShadow;
  vi.spyOn(Element.prototype, "attachShadow").mockImplementation(function (
    this: Element,
    init: ShadowRootInit
  ) {
    const root = attachShadow.call(this, init);
    roots.push(root);
    return root;
  });
  const widget = new RefletFeedbackWidget({
    publicKey: "fb_pub_test",
    ...config,
  });
  const initializing = widget.init();
  whileInitializing?.(widget);
  await initializing;
  const [root] = roots;
  if (!root) {
    throw new Error("The widget did not create a shadow root");
  }
  return { root, widget };
};

export const surveyDialog = (root: ShadowRoot): HTMLElement | null =>
  root.querySelector<HTMLElement>(".reflet-survey");

export const visibleQuestionTitle = (root: ShadowRoot): string | null =>
  root.querySelector(".reflet-survey-question-title")?.textContent ?? null;

export const click = (root: ShadowRoot, selector: string): void => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`Nothing matches ${selector}`);
  }
  element.click();
};

export const optionLabelled = (
  root: ShadowRoot,
  label: string
): HTMLElement => {
  const option = [...root.querySelectorAll<HTMLElement>("[data-select]")].find(
    (element) =>
      element.getAttribute("aria-label") === label ||
      element.textContent?.trim() === label
  );
  if (!option) {
    throw new Error(`No option labelled ${label}`);
  }
  return option;
};

export const typeInto = (
  element: HTMLInputElement | HTMLTextAreaElement | null,
  text: string
): void => {
  if (!element) {
    throw new Error("No field to type into");
  }
  element.value = text;
  element.dispatchEvent(new Event("input", { bubbles: true }));
};
