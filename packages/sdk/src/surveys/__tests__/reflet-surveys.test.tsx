import type { PublicSurvey } from "@reflet/survey-core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Reflet } from "../../client";
import { RefletProvider } from "../../react-context";
import { RefletSurveys } from "../reflet-surveys";
import { SURVEY_HOST_ATTRIBUTE } from "../survey-portal";
import { useRefletSurveys } from "../use-reflet-surveys";
import { question, survey } from "./fixtures";

const BASE_URL = "https://api.reflet.test";

const pricingSurvey = survey({
  _id: "pricing",
  questions: [question("q1", 0, { title: "Is our pricing clear?" })],
  triggerConfig: { pageUrl: "/pricing" },
  triggerType: "page_visit",
});

const blogSurvey = survey({
  _id: "blog",
  questions: [question("q1", 0, { title: "Enjoying the blog?" })],
  triggerConfig: { pageUrl: "/blog" },
  triggerType: "page_visit",
});

const checkoutSurvey = survey({
  _id: "checkout",
  questions: [question("q1", 0, { title: "How was checkout?" })],
  triggerConfig: { eventName: "checkout_completed" },
  triggerType: "event",
});

const afterFeedbackSurvey = survey({
  _id: "after-feedback",
  questions: [question("q1", 0, { title: "How easy was reporting that?" })],
  triggerType: "feedback_submitted",
});

function mockApi(surveys: PublicSurvey[]) {
  return vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const { pathname } = new URL(String(input));
    const respond = (body: unknown) =>
      Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    if (pathname === "/api/v1/surveys/eligible") {
      return respond({ surveys });
    }
    if (pathname === "/api/v1/surveys/respond/start") {
      return respond({ responseId: "response-1" });
    }
    if (init?.method === "POST") {
      return respond({ success: true });
    }
    return respond({ error: "Not found" });
  });
}

let fetchMock = mockApi([]);

const serve = (surveys: PublicSurvey[]) => {
  fetchMock = mockApi(surveys);
  vi.stubGlobal("fetch", fetchMock);
};

const requestsTo = (pathname: string) =>
  fetchMock.mock.calls.filter(
    ([input]) => new URL(String(input)).pathname === pathname
  );

async function shownSurvey(): Promise<HTMLElement> {
  return await waitFor(() => {
    const card = document
      .querySelector(`[${SURVEY_HOST_ATTRIBUTE}]`)
      ?.shadowRoot?.querySelector(".rf-survey");
    if (!(card instanceof HTMLElement)) {
      throw new Error("No survey on screen");
    }
    return card;
  });
}

function CheckoutButton() {
  const { activeSurveyId, track } = useRefletSurveys();
  return (
    <button onClick={() => track("checkout_completed")} type="button">
      Pay {activeSurveyId ? `(survey ${activeSurveyId})` : ""}
    </button>
  );
}

let keyCounter = 0;

const renderSurveys = (children?: ReactNode) => {
  keyCounter += 1;
  const publicKey = `pk_test_${keyCounter}`;
  const rendered = render(
    <RefletProvider baseUrl={BASE_URL} publicKey={publicKey}>
      {children}
      <RefletSurveys primaryColor="#0f766e" />
    </RefletProvider>
  );
  return { ...rendered, publicKey };
};

/** Eligible surveys are loaded and armed, and nothing is on screen yet. */
async function surveysArmed(): Promise<void> {
  await waitFor(() =>
    expect(requestsTo("/api/v1/surveys/eligible")).toHaveLength(1)
  );
  await act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      })
  );
  expect(document.querySelector(`[${SURVEY_HOST_ATTRIBUTE}]`)).toBeNull();
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("shows the page-visit survey whose URL matches the current page", async () => {
  window.history.pushState({}, "", "/pricing");
  serve([blogSurvey, pricingSurvey]);

  renderSurveys();

  const card = await shownSurvey();
  expect(
    within(card).getByRole("heading", { name: "Is our pricing clear?" })
  ).toBeDefined();
  const [[eligibleUrl]] = requestsTo("/api/v1/surveys/eligible");
  expect(
    new URL(String(eligibleUrl)).searchParams.get("respondentId")
  ).toBeTruthy();
  expect(
    JSON.parse(
      String(requestsTo("/api/v1/surveys/respond/start")[0]?.[1]?.body)
    )
  ).toMatchObject({
    pageUrl: "http://localhost:3000/pricing",
    surveyId: "pricing",
  });
});

test("track() shows the survey triggered by that event", async () => {
  serve([checkoutSurvey]);
  const { getByRole } = renderSurveys(<CheckoutButton />);
  await surveysArmed();

  fireEvent.click(getByRole("button", { name: "Pay" }));

  const card = await shownSurvey();
  expect(
    within(card).getByRole("heading", { name: "How was checkout?" })
  ).toBeDefined();
  expect(getByRole("button", { name: "Pay (survey checkout)" })).toBeDefined();
});

test("feedback created through the client shows a feedback_submitted survey", async () => {
  serve([afterFeedbackSurvey]);
  const { publicKey } = renderSurveys();
  await surveysArmed();

  await act(() =>
    new Reflet({ baseUrl: BASE_URL, publicKey }).create({
      description: "Clicking Export on the reports page has no effect.",
      title: "Export button does nothing",
    })
  );

  const card = await shownSurvey();
  expect(
    within(card).getByRole("heading", { name: "How easy was reporting that?" })
  ).toBeDefined();
});

function TrackOnMount() {
  const { track } = useRefletSurveys();
  useEffect(() => {
    track("checkout_completed");
  }, [track]);
  return null;
}

test("track() called before surveys load is replayed once they arrive", async () => {
  serve([checkoutSurvey]);

  renderSurveys(<TrackOnMount />);

  const card = await shownSurvey();
  expect(
    within(card).getByRole("heading", { name: "How was checkout?" })
  ).toBeDefined();
});

test("closing a survey mid-way dismisses its response", async () => {
  window.history.pushState({}, "", "/pricing");
  serve([pricingSurvey]);
  renderSurveys();

  const card = await shownSurvey();
  fireEvent.click(within(card).getByRole("button", { name: "Close survey" }));

  await waitFor(() =>
    expect(requestsTo("/api/v1/surveys/respond/dismiss")).toHaveLength(1)
  );
  const [[, init]] = requestsTo("/api/v1/surveys/respond/dismiss");
  expect(JSON.parse(String(init?.body))).toEqual({ responseId: "response-1" });
  await waitFor(() =>
    expect(document.querySelector(`[${SURVEY_HOST_ATTRIBUTE}]`)).toBeNull()
  );
});

test("unmounting mid-survey dismisses the open response", async () => {
  window.history.pushState({}, "", "/pricing");
  serve([pricingSurvey]);
  const { unmount } = renderSurveys();
  await shownSurvey();

  unmount();

  await waitFor(() =>
    expect(requestsTo("/api/v1/surveys/respond/dismiss")).toHaveLength(1)
  );
  expect(document.querySelector(`[${SURVEY_HOST_ATTRIBUTE}]`)).toBeNull();
});
