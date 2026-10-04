import type { Metadata } from "next";

import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Add a floating feedback button to your website for collecting feature requests and bug reports.",
  path: "/docs/widget/feedback-widget",
  title: "Feedback widget",
});

const SECTIONS = [
  { id: "script-tag", label: "Script tag embed" },
  { id: "react", label: "React component" },
  { id: "configuration", label: "Configuration" },
  { id: "user-identification", label: "User identification" },
  { id: "surveys", label: "Surveys" },
] as const;

const SCRIPT_TAG = `<script
  src="https://www.reflet.app/widget/feedback.js"
  data-key="fb_pub_xxx"
  data-position="bottom-right"
  async
></script>`;

const REACT_USAGE = `import { RefletProvider, FeedbackButton } from "reflet-sdk/react";

function App() {
  return (
    <RefletProvider publicKey="fb_pub_xxx">
      <FeedbackButton position="bottom-right" />
    </RefletProvider>
  );
}`;

const SURVEY_CONFIG = `window.Reflet = {
  publicKey: "fb_pub_xxx",
  // Set to false to stop surveys from showing automatically
  features: { surveys: true },
  survey: {
    onSurveyStart: ({ surveyId, responseId, title }) => {},
    onQuestionAnswer: ({ surveyId, questionId, value }) => {},
    onSurveyComplete: ({ surveyId, responseId, endingId }) => {},
    onSurveyDismiss: ({ surveyId, responseId, answeredCount }) => {},
  },
};`;

const SURVEY_METHODS = `const reflet = window.__refletFeedbackWidgetInstance;

// Shows surveys whose trigger is the custom event "checkout_completed"
reflet.track("checkout_completed");

// Shows a survey on demand, including manual ones. Resolves false when it can't be shown now.
await reflet.showSurvey("survey_id");

// Closes the open survey
reflet.dismissSurvey();`;

const SURVEY_METHOD_ROWS = [
  {
    cells: [
      "track(eventName)",
      "string",
      "Shows surveys triggered by this custom event, if the visitor is eligible.",
    ],
    key: "track",
  },
  {
    cells: [
      "showSurvey(surveyId)",
      "string → Promise<boolean>",
      "Shows one survey now. Works for manual surveys. Only one survey is open at a time.",
    ],
    key: "showSurvey",
  },
  {
    cells: [
      "dismissSurvey()",
      "—",
      "Closes the open survey and records it as dismissed.",
    ],
    key: "dismissSurvey",
  },
  {
    cells: [
      "features.surveys",
      "boolean",
      "Set to false to turn off automatic surveys. Defaults to true.",
    ],
    key: "features-surveys",
  },
] as const;

const COLUMNS = [
  { kind: "name", label: "Attribute / prop" },
  { kind: "code", label: "Values" },
  { kind: "text", label: "Description" },
] as const;

const ROWS = [
  {
    cells: [
      "data-key / publicKey",
      "string",
      "Your organization’s public API key. Required.",
    ],
    key: "key",
  },
  {
    cells: [
      "data-position / position",
      "bottom-right | bottom-left",
      "Where the floating button appears. Defaults to bottom-right.",
    ],
    key: "position",
  },
  {
    cells: [
      "data-theme / theme",
      "light | dark | auto",
      "Widget color scheme. Defaults to auto, which follows the system.",
    ],
    key: "theme",
  },
] as const;

export default function FeedbackWidgetPage() {
  return (
    <DocsPage
      description="A floating button that opens a feedback form. Supports feature requests, bug reports and general feedback."
      sections={SECTIONS}
      title="Feedback widget"
    >
      <DocsSection id="script-tag" sections={SECTIONS}>
        <DocsText>
          Add this script tag to your HTML to load the widget.
        </DocsText>
        <CodeBlock code={SCRIPT_TAG} />
      </DocsSection>

      <DocsSection id="react" sections={SECTIONS}>
        <DocsText>
          In React projects, use the SDK’s FeedbackButton component instead.
        </DocsText>
        <CodeBlock code={REACT_USAGE} />
      </DocsSection>

      <DocsSection id="configuration" sections={SECTIONS}>
        <ReferenceTable columns={COLUMNS} rows={ROWS} />
      </DocsSection>

      <DocsSection id="user-identification" sections={SECTIONS}>
        <DocsText>
          To tie feedback to signed-in users, pass user data through the SDK or
          data attributes. The{" "}
          <DocsLink href="/docs/sdk/installation#user-signing">
            SDK installation guide
          </DocsLink>{" "}
          covers SSO user signing.
        </DocsText>
      </DocsSection>

      <DocsSection id="surveys" sections={SECTIONS}>
        <DocsText>
          Active surveys show up on their own. The widget loads the surveys each
          visitor may see, then shows one when its trigger fires: a page visit,
          time on page, exit intent, a custom event or a submitted feedback
          post. Display frequency, sampling, schedule and response limits come
          from the survey settings in your dashboard. Answers branch to the
          right next question and ending as the visitor goes.
        </DocsText>
        <CodeBlock code={SURVEY_CONFIG} />
        <DocsText>
          Use the widget instance to trigger surveys from your app.
        </DocsText>
        <CodeBlock code={SURVEY_METHODS} />
        <ReferenceTable columns={COLUMNS} rows={SURVEY_METHOD_ROWS} />
        <DocsText>
          Building with React? The{" "}
          <DocsLink href="/docs/sdk/surveys">SDK surveys guide</DocsLink> covers
          the same surveys as a component, plus custom survey UIs.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
