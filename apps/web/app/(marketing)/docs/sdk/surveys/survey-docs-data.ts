import type { ReferenceRow } from "@/components/docs/reference-table";

export const MOUNT_CODE = `import { RefletProvider, RefletSurveys } from "reflet-sdk/react";

export function App({ children, userToken }) {
  return (
    <RefletProvider publicKey="fb_pub_xxx" userToken={userToken}>
      {children}
      <RefletSurveys />
    </RefletProvider>
  );
}`;

export const SIGNALS_CODE = `import { useEffect } from "react";
import { useRefletSurveys } from "reflet-sdk/react";

function OrderConfirmation() {
  const { track } = useRefletSurveys();

  useEffect(() => {
    track("checkout_completed");
  }, [track]);

  return <p>Thanks for your order!</p>;
}

function HelpMenu() {
  const { showSurvey } = useRefletSurveys();

  return (
    <button onClick={() => showSurvey("kv91…")} type="button">
      Tell us how we’re doing
    </button>
  );
}`;

export const CALLBACKS_CODE = `<RefletSurveys
  onSurveyStart={({ surveyId, responseId }) => {}}
  onSurveyAnswer={({ surveyId, questionId, value }) => {}}
  onSurveyComplete={({ surveyId, responseId, endingId }) => {}}
  onSurveyDismiss={({ surveyId, responseId, answeredCount }) => {}}
/>`;

export const CARD_CODE = `import { useEffect, useState } from "react";
import {
  type PublicSurvey,
  SurveyCard,
  useRefletClient,
  useSurveySession,
} from "reflet-sdk/react";

function InlineSurvey({ survey }: { survey: PublicSurvey }) {
  const session = useSurveySession(survey);
  return <SurveyCard session={session} variant="inline" />;
}

export function SettingsSurvey({ surveyId }: { surveyId: string }) {
  const client = useRefletClient();
  const [survey, setSurvey] = useState<PublicSurvey>();

  useEffect(() => {
    client.getEligibleSurveys().then((surveys) => {
      setSurvey(surveys.find((candidate) => candidate._id === surveyId));
    });
  }, [client, surveyId]);

  return survey ? <InlineSurvey survey={survey} /> : null;
}`;

export const HEADLESS_CODE = `import { type PublicSurvey, useSurveySession } from "reflet-sdk/react";

function TextOnlySurvey({ survey }: { survey: PublicSurvey }) {
  const { back, next, setAnswer, snapshot } = useSurveySession(survey);
  const { answers, canGoBack, ending, error, isLastStep, phase, question } =
    snapshot;

  if (phase === "ending") {
    return <p>{ending?.title}</p>;
  }
  if (phase !== "question" || !question) {
    return null;
  }

  const answer = answers.get(question._id);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        next();
      }}
    >
      <label htmlFor="survey-answer">{question.title}</label>
      <input
        id="survey-answer"
        onChange={(event) => setAnswer(event.target.value || undefined)}
        value={typeof answer === "string" ? answer : ""}
      />
      {error && <p role="alert">{error}</p>}
      {canGoBack && (
        <button onClick={back} type="button">
          Back
        </button>
      )}
      <button disabled={snapshot.isSubmitting} type="submit">
        {isLastStep ? "Submit" : "Next"}
      </button>
    </form>
  );
}`;

export const PREVIEW_CODE = `import {
  previewTransport,
  SurveyCard,
  useSurveySession,
} from "reflet-sdk/surveys";

function SurveyPreview({ survey }) {
  const session = useSurveySession(survey, { transport: previewTransport });
  return <SurveyCard session={session} theme="light" variant="page" />;
}`;

export const CLIENT_CODE = `import { Reflet } from "reflet-sdk";

const reflet = new Reflet({ publicKey: "fb_pub_xxx", userToken });

const [survey] = await reflet.getEligibleSurveys();
if (survey) {
  const { responseId } = await reflet.startSurveyResponse({
    surveyId: survey._id,
  });
  await reflet.submitSurveyAnswer({
    responseId,
    questionId: survey.questions[0]._id,
    value: 9,
  });
  const { endingId } = await reflet.completeSurveyResponse(responseId);
}`;

const row = (key: string, ...cells: string[]): ReferenceRow => ({
  cells,
  key,
});

export const TRIGGER_COLUMNS = [
  { kind: "name", label: "Trigger" },
  { kind: "text", label: "Shows the survey" },
] as const;

export const TRIGGER_ROWS = [
  row(
    "page_visit",
    "page_visit",
    "As soon as the visitor is on a matching page, including pages reached by client-side navigation."
  ),
  row(
    "time_delay",
    "time_delay",
    "After the visitor has spent the set time on a matching page (5 seconds by default). Navigating restarts the countdown."
  ),
  row(
    "exit_intent",
    "exit_intent",
    "When the pointer leaves the window through the top edge, the usual sign of reaching for a tab or the address bar."
  ),
  row(
    "event",
    "event",
    "When your app calls track() with the survey’s event name."
  ),
  row(
    "feedback_submitted",
    "feedback_submitted",
    "Right after the visitor submits feedback through the SDK with the same public key: FeedbackButton, useCreateFeedback or reflet.create()."
  ),
  row("manual", "manual", "Only when your app calls showSurvey() with its ID."),
] as const;

export const TARGETING_COLUMNS = [
  { kind: "name", label: "Setting" },
  { kind: "text", label: "Behavior" },
] as const;

export const TARGETING_ROWS = [
  row(
    "pages",
    "Pages",
    "Comma- or newline-separated URL patterns with * wildcards. A pattern starting with / matches the path, anything else the full URL. Leave it empty for every page. Applies to every trigger except showSurvey()."
  ),
  row(
    "once",
    "Show once",
    "Never shown again to someone who has seen it, whether they answered or not."
  ),
  row(
    "until_completed",
    "Until completed",
    "Shown again after the wait (7 days by default) until the respondent completes it."
  ),
  row(
    "recurring",
    "Recurring",
    "Shown again after every wait, even to people who completed it."
  ),
  row(
    "sample",
    "Sample",
    "The share of respondents who see it, as a percentage. The same respondent is always in or always out."
  ),
  row(
    "schedule",
    "Schedule and cap",
    "Outside its start and end dates the survey isn’t shown. It closes once completed responses reach the cap."
  ),
] as const;

export const API_COLUMNS = [
  { kind: "name", label: "Member" },
  { kind: "code", label: "Type" },
  { kind: "text", label: "Description" },
] as const;

export const SURVEYS_API_ROWS = [
  row(
    "track",
    "track",
    "(eventName: string) => void",
    "Shows an eligible survey whose trigger is this custom event."
  ),
  row(
    "showSurvey",
    "showSurvey",
    "(surveyId: string) => void",
    "Shows an eligible survey now, whatever its trigger. Does nothing if this visitor isn’t eligible."
  ),
  row(
    "dismissSurvey",
    "dismissSurvey",
    "() => void",
    "Closes the survey on screen. An unfinished response is marked abandoned."
  ),
  row(
    "activeSurveyId",
    "activeSurveyId",
    "string | null",
    "The survey on screen, or null."
  ),
] as const;

export const SESSION_ROWS = [
  row(
    "snapshot",
    "snapshot",
    "SurveySessionSnapshot",
    "phase (starting, start_failed, question, ending, dismissed), question, answers, ending, error, progress (0–1), canGoBack, isLastStep, isSubmitting."
  ),
  row(
    "setAnswer",
    "setAnswer",
    "(value: AnswerValue | undefined) => void",
    "Sets the current question’s answer. undefined clears it."
  ),
  row(
    "next",
    "next",
    "() => Promise<void>",
    "Saves the answer and follows the branching rules to the next question or ending. Sets error when a required answer is missing or saving fails."
  ),
  row(
    "back",
    "back",
    "() => void",
    "Returns to the previous question on the respondent’s path."
  ),
  row(
    "dismiss",
    "dismiss",
    "() => void",
    "Ends the session. An unfinished response is marked abandoned."
  ),
  row(
    "start",
    "start",
    "() => Promise<void>",
    "Starts the response. Only needed with autoStart: false or to retry after start_failed."
  ),
] as const;

export const CLIENT_ROWS = [
  row(
    "getEligibleSurveys",
    "getEligibleSurveys()",
    "Promise<PublicSurvey[]>",
    "Surveys this visitor may see now. The API applies schedule, cap, display frequency and sampling."
  ),
  row(
    "startSurveyResponse",
    "startSurveyResponse({ surveyId, pageUrl? })",
    "Promise<{ responseId }>",
    "Opens a response. pageUrl defaults to the current page."
  ),
  row(
    "submitSurveyAnswer",
    "submitSurveyAnswer({ responseId, questionId, value })",
    "Promise<{ answerId }>",
    "Saves or replaces one answer. value: null clears it."
  ),
  row(
    "completeSurveyResponse",
    "completeSurveyResponse(responseId)",
    "Promise<{ endingId }>",
    "Finishes the response and returns the ending the answers lead to."
  ),
  row(
    "dismissSurveyResponse",
    "dismissSurveyResponse(responseId)",
    "Promise<void>",
    "Marks an unfinished response abandoned."
  ),
] as const;
