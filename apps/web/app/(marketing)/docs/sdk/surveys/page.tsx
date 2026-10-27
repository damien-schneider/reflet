import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";
import {
  CARD_CODE,
  CLIENT_CODE,
  CLIENT_ROWS,
  MOUNT_CODE,
  PREVIEW_CODE,
  REFERENCE_COLUMNS,
  SIGNALS_CODE,
  TRIGGER_ROWS,
} from "./survey-docs-data";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Deliver surveys in React, control triggers, or render a headless survey session.",
  path: "/docs/sdk/surveys",
  title: "Surveys",
});

const SECTIONS = [
  { id: "setup", label: "Deliver a survey" },
  { id: "triggers", label: "Choose when it opens" },
  { id: "targeting", label: "Understand eligibility" },
  { id: "custom-ui", label: "Render a survey yourself" },
  { id: "javascript-client", label: "Call the response API" },
] as const;

export default function SdkSurveysPage() {
  return (
    <DocsPage
      description="Build and publish a survey in Reflet, then deliver it in your app or render its questions yourself."
      sections={SECTIONS}
      title="Surveys"
    >
      <DocsSection id="setup" sections={SECTIONS}>
        <DocsText>
          Install <code>reflet-sdk</code> and React, configure your public key's
          allowed origins, then mount <code>RefletSurveys</code> once inside a
          provider. Publish an in-app survey in the dashboard. An unpublished or
          ineligible survey will not appear.
        </DocsText>
        <CodeBlock code={MOUNT_CODE} />
        <DocsText>
          Delivery loads eligible surveys and displays one floating card at a
          time in a shadow root. It supports ratings (number, star, or emoji),
          NPS, text, single choice, multiple choice, boolean, and statement
          steps, including branching and multiple endings.
        </DocsText>
        <DocsList>
          <li>
            <code>enabled</code> defaults to true. Set it false to stop delivery
            and dismiss the active survey.
          </li>
          <li>
            <code>theme</code> is auto (default), light, or dark.{" "}
            <code>primaryColor</code> overrides the organization's brand color.
            Position comes from the survey's display settings.
          </li>
          <li>
            Callbacks are{" "}
            <code>onSurveyStart({"{ responseId, surveyId }"})</code>,{" "}
            <code>onSurveyAnswer({"{ questionId, surveyId, value }"})</code>,{" "}
            <code>
              onSurveyComplete({"{ endingId, responseId, surveyId }"})
            </code>
            , and{" "}
            <code>
              onSurveyDismiss({"{ answeredCount, responseId, surveyId }"})
            </code>
            . Dismiss responseId can be null when start never completed.
          </li>
          <li>
            An ending without a button closes after six seconds. Closing a
            completed ending does not emit onSurveyDismiss.
          </li>
        </DocsList>
        <DocsText>
          Automatic delivery does not expose a loading or error hook. If the
          eligibility request fails, no survey opens. Use the client API below
          when your interface must display those failures. Non-React sites can
          use the{" "}
          <DocsLink href="/docs/widget/feedback-widget#surveys">
            script widget's survey delivery
          </DocsLink>
          .
        </DocsText>
      </DocsSection>
      <DocsSection id="triggers" sections={SECTIONS}>
        <ReferenceTable columns={REFERENCE_COLUMNS} rows={TRIGGER_ROWS} />
        <DocsText>
          Use <code>useRefletSurveys()</code> inside the provider to send
          events, open an eligible survey manually, close the active one, or
          read its ID. Mount the delivery component as well; the hook alone
          renders nothing.
        </DocsText>
        <CodeBlock code={SIGNALS_CODE} />
        <DocsText>
          Signals sent before eligibility loads are queued, up to the most
          recent 50 calls. <code>showSurvey</code> is not a way around schedule,
          sampling, or frequency limits. Automatic triggers fire each survey at
          most once per delivery mount; a busy card prevents another from
          opening.
        </DocsText>
      </DocsSection>
      <DocsSection id="targeting" sections={SECTIONS}>
        <DocsList>
          <li>
            The API applies publication state, delivery mode, schedule,
            completed-response cap, frequency, and stable percentage sampling.
            Response start checks eligibility again.
          </li>
          <li>
            <code>once</code> prevents another showing after a response starts.{" "}
            <code>until_completed</code> allows another showing after the
            recontact delay unless completed. <code>recurring</code> allows
            another after that delay.
          </li>
          <li>
            Anonymous browser IDs are stored in localStorage under{" "}
            <code>reflet:respondent-id</code>. If storage is blocked, the ID
            lasts only for the current page. Clearing storage changes anonymous
            frequency and sampling identity.
          </li>
          <li>
            For identity across devices, pass a{" "}
            <DocsLink href="/docs/sdk/installation#user-signing">
              server-signed userToken
            </DocsLink>
            .
          </li>
          <li>
            Page patterns accept comma- or newline-separated alternatives and{" "}
            <code>*</code> wildcards. <code>/checkout/*</code> matches paths
            (including <code>#/</code> routes); <code>app.example.com/*</code>{" "}
            matches host and path; a pattern with a scheme matches origin and
            path. Query parameters are not used for matching.
          </li>
        </DocsList>
        <DocsText>
          Responses are sent to Reflet. <code>pageUrl</code> defaults to the
          full browser URL, so keep credentials and sensitive values out of page
          addresses.
        </DocsText>
      </DocsSection>
      <DocsSection id="custom-ui" sections={SECTIONS}>
        <DocsText>
          Import from <code>reflet-sdk/surveys</code> when you need rendering
          without automatic delivery. <code>useSurveySession</code> manages
          answers, required-field validation, branching, back navigation, saves,
          and endings. Supply a survey returned by the API, not just its ID.
        </DocsText>
        <CodeBlock code={CARD_CODE} />
        <DocsText>
          <code>SurveyCard</code> accepts session, variant (<code>inline</code>{" "}
          by default, <code>floating</code>, or <code>page</code>), theme,
          primaryColor, className, and onClose. Closing dismisses an unfinished
          response before calling onClose. Stable survey and transport
          identities matter: replacing either creates a new response session.
        </DocsText>
        <DocsText>
          For a preview that saves nothing, choose the preview transport
          explicitly. Outside a provider it is also the default. Inside a
          provider, the hook defaults to a real Reflet transport instead.
        </DocsText>
        <CodeBlock code={PREVIEW_CODE} />
        <DocsText>
          For your own UI, use the handle's <code>survey</code> and{" "}
          <code>snapshot</code>, then call <code>setAnswer(value)</code>,{" "}
          <code>next()</code>, <code>back()</code>, or <code>dismiss()</code>.{" "}
          <code>setAnswer(undefined)</code> clears the current answer. Snapshot
          fields are answers (a read-only Map), question, ending, phase,
          progress (0 to 1), canGoBack, isLastStep, isSubmitting, and error.
          Render the error and disable submission while isSubmitting.
        </DocsText>
        <DocsText>
          Phases are starting, start_failed, question, ending, and dismissed.
          <code>start()</code> retries a start failure. Pass{" "}
          <code>autoStart: false</code> to wait for your own action. The
          callbacks option uses onStart, onAnswer, onComplete, and onDismiss
          with the payloads described above. For non-React rendering, construct{" "}
          <code>new SurveySession({"{ survey, transport, callbacks }"})</code>{" "}
          and subscribe to <code>getSnapshot()</code>;{" "}
          <code>useSessionHandle</code> adapts that existing session to React. A
          custom <code>SurveyTransport</code> must implement start, answer,
          complete, and dismiss.
        </DocsText>
      </DocsSection>
      <DocsSection id="javascript-client" sections={SECTIONS}>
        <CodeBlock code={CLIENT_CODE} />
        <ReferenceTable columns={REFERENCE_COLUMNS} rows={CLIENT_ROWS} />
        <DocsText>
          These methods do not render questions or choose the next step. Prefer
          SurveySession when building a custom UI so its flow and validation
          stay consistent. The{" "}
          <DocsLink href="/docs/api">HTTP API guide</DocsLink> covers direct
          requests; the{" "}
          <DocsLink href="/docs/sdk/client#errors">client error guide</DocsLink>{" "}
          covers failed method calls.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
