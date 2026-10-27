export const MOUNT_CODE = `"use client";

import { RefletProvider, RefletSurveys } from "reflet-sdk/react";

export function SurveyDelivery({ userToken }: { userToken?: string }) {
  return (
    <RefletProvider publicKey="fb_pub_YOUR_PUBLIC_KEY" userToken={userToken}>
      <RefletSurveys theme="auto" />
    </RefletProvider>
  );
}`;

export const SIGNALS_CODE = `import { useRefletSurveys } from "reflet-sdk/react";

export function SurveyActions({ surveyId }: { surveyId: string }) {
  const { activeSurveyId, track, showSurvey, dismissSurvey } = useRefletSurveys();

  return (
    <>
      <button onClick={() => track("checkout_completed")} type="button">
        Notify checkout completed
      </button>
      <button onClick={() => showSurvey(surveyId)} type="button">
        Open survey
      </button>
      {activeSurveyId && (
        <button onClick={dismissSurvey} type="button">Close survey</button>
      )}
    </>
  );
}`;

export const CARD_CODE = `"use client";

import { Reflet } from "reflet-sdk";
import {
  createRefletSurveyTransport,
  SurveyCard,
  useSurveySession,
  type PublicSurvey,
} from "reflet-sdk/surveys";

const client = new Reflet({ publicKey: "fb_pub_YOUR_PUBLIC_KEY" });
const transport = createRefletSurveyTransport(client);

// Pass a stable survey object returned by client.getEligibleSurveys().
export function InlineSurvey({ survey }: { survey: PublicSurvey }) {
  const session = useSurveySession(survey, { transport });
  return <SurveyCard session={session} variant="inline" />;
}`;

export const PREVIEW_CODE = `import {
  previewTransport,
  SurveyCard,
  useSurveySession,
  type PublicSurvey,
} from "reflet-sdk/surveys";

export function SurveyPreview({ survey }: { survey: PublicSurvey }) {
  const session = useSurveySession(survey, { transport: previewTransport });
  return <SurveyCard session={session} variant="page" />;
}`;

export const CLIENT_CODE = `import { Reflet } from "reflet-sdk";

const reflet = new Reflet({ publicKey: "fb_pub_YOUR_PUBLIC_KEY" });
const surveys = await reflet.getEligibleSurveys();
const survey = surveys[0];

if (survey) {
  const { responseId } = await reflet.startSurveyResponse({
    surveyId: survey._id,
  });
  // Your UI now walks survey.questions and its branching rules.
  // Save each answer with submitSurveyAnswer, then complete the reached path.
  // If the visitor closes early:
  await reflet.dismissSurveyResponse(responseId);
}`;

export const REFERENCE_COLUMNS = [
  { kind: "name", label: "Name" },
  { kind: "text", label: "Behavior" },
] as const;

export const TRIGGER_ROWS = [
  {
    cells: [
      "manual",
      "Call showSurvey(surveyId). The survey must be in the current eligible set.",
    ],
    key: "manual",
  },
  {
    cells: [
      "page_visit",
      "Runs on a matching page, including client-side and hash-route navigation.",
    ],
    key: "page_visit",
  },
  {
    cells: [
      "time_delay",
      "Waits triggerConfig.delayMs on a matching page. Navigation resets the timer.",
    ],
    key: "time_delay",
  },
  {
    cells: [
      "exit_intent",
      "Runs when the mouse leaves through the top of the document. Not a mobile back-navigation trigger.",
    ],
    key: "exit_intent",
  },
  {
    cells: [
      "feedback_submitted",
      "Runs after successful Reflet client feedback creation for the same public key and API origin.",
    ],
    key: "feedback_submitted",
  },
  {
    cells: [
      "event",
      "Call track(eventName) with the exact triggerConfig.eventName.",
    ],
    key: "event",
  },
] as const;

export const CLIENT_ROWS = [
  {
    cells: [
      "getEligibleSurveys()",
      "PublicSurvey[] after API eligibility checks. Each has questions, branching rules, endings, display, and trigger configuration.",
    ],
    key: "eligible",
  },
  {
    cells: [
      "startSurveyResponse({ surveyId, pageUrl? })",
      "{ responseId }. Opens a response and rechecks eligibility. Browser calls add respondent ID, current page URL, and user agent.",
    ],
    key: "start",
  },
  {
    cells: [
      "submitSurveyAnswer({ responseId, questionId, value })",
      "{ answerId }. value is string, number, boolean, string[], or null to clear an answer.",
    ],
    key: "answer",
  },
  {
    cells: [
      "completeSurveyResponse(responseId)",
      "{ endingId }. The API validates answers and walks the flow to the ending.",
    ],
    key: "complete",
  },
  {
    cells: [
      "dismissSurveyResponse(responseId)",
      "Marks an unfinished response abandoned. Returns no value.",
    ],
    key: "dismiss",
  },
] as const;
