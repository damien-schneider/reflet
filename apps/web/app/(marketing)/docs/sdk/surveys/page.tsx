import type { Metadata } from "next";

import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsText,
} from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { PropsTable } from "@/components/docs/props-table";
import { ReferenceTable } from "@/components/docs/reference-table";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";
import {
  API_COLUMNS,
  CALLBACKS_CODE,
  CARD_CODE,
  CLIENT_CODE,
  CLIENT_ROWS,
  HEADLESS_CODE,
  MOUNT_CODE,
  PREVIEW_CODE,
  SESSION_ROWS,
  SIGNALS_CODE,
  SURVEYS_API_ROWS,
  TARGETING_COLUMNS,
  TARGETING_ROWS,
  TRIGGER_COLUMNS,
  TRIGGER_ROWS,
} from "./survey-docs-data";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Show in-app NPS, CSAT and custom surveys with the Reflet SDK: triggers, targeting, callbacks, theming and fully custom survey UIs.",
  keywords: ["in-app surveys", "nps", "csat", "react surveys", "sdk"],
  path: "/docs/sdk/surveys",
  title: "Surveys",
});

const SECTIONS = [
  { id: "setup", label: "Setup" },
  { id: "triggers", label: "Triggers" },
  { id: "targeting", label: "Who sees a survey" },
  { id: "use-reflet-surveys", label: "useRefletSurveys" },
  { id: "callbacks", label: "Callbacks" },
  { id: "theming", label: "Theming" },
  { id: "custom-ui", label: "Custom survey UI" },
  { id: "javascript-client", label: "JavaScript client" },
] as const;

const SURVEYS_PROPS = [
  {
    default: "true",
    description:
      "Turn delivery off without unmounting, e.g. on pages where a survey would interrupt.",
    name: "enabled",
    type: "boolean",
  },
  {
    default: "auto",
    description: "auto follows the visitor’s light or dark system setting.",
    name: "theme",
    type: '"auto" | "light" | "dark"',
  },
  {
    default: "Your brand color",
    description: "Accent for buttons, selections and progress. Any CSS color.",
    name: "primaryColor",
    type: "string",
  },
  {
    description: "Lifecycle callbacks, described below.",
    name: "onSurveyStart, onSurveyAnswer, onSurveyComplete, onSurveyDismiss",
    type: "function",
  },
] as const;

const CARD_PROPS = [
  {
    description: "The value returned by useSurveySession.",
    name: "session",
    required: true,
    type: "SurveySessionHandle",
  },
  {
    default: "inline",
    description:
      "floating for an overlay card, inline inside your layout, page for a full-page survey.",
    name: "variant",
    type: '"floating" | "inline" | "page"',
  },
  {
    default: "auto",
    description: "auto follows the system setting.",
    name: "theme",
    type: '"auto" | "light" | "dark"',
  },
  {
    description: "Accent color. Any CSS color.",
    name: "primaryColor",
    type: "string",
  },
  {
    description:
      "Shows a close button. Closing mid-survey marks the response abandoned first.",
    name: "onClose",
    type: "() => void",
  },
  {
    description: "Extra class on the card’s root element.",
    name: "className",
    type: "string",
  },
] as const;

export default function SdkSurveysPage() {
  return (
    <DocsPage
      description={
        <>
          Show NPS, CSAT and custom surveys inside your React app. Build them in
          the dashboard with branching and several endings, then mount{" "}
          <InlineCode>RefletSurveys</InlineCode> once.
        </>
      }
      sections={SECTIONS}
      title="Surveys"
    >
      <DocsSection id="setup" sections={SECTIONS}>
        <InstallCommand command="npm install reflet-sdk" />
        <DocsText>
          Mount <InlineCode>RefletSurveys</InlineCode> once inside{" "}
          <InlineCode>RefletProvider</InlineCode>. It loads the surveys this
          visitor is eligible for, arms their triggers and shows one survey at a
          time in a floating card. The card lives in its own shadow root, so
          your CSS never restyles it.
        </DocsText>
        <CodeBlock code={MOUNT_CODE} />
        <PropsTable props={SURVEYS_PROPS} />
        <DocsText>
          Pass a signed <InlineCode>userToken</InlineCode> (see{" "}
          <DocsLink href="/docs/sdk/installation#user-signing">
            user signing
          </DocsLink>
          ) or <InlineCode>user</InlineCode> to credit responses to your users
          and recognize them across devices. Anonymous visitors get a stable ID
          in <InlineCode>localStorage</InlineCode>, so “show once” holds across
          visits. Not using React? The{" "}
          <DocsLink href="/docs/widget/feedback-widget#surveys">
            feedback widget
          </DocsLink>{" "}
          delivers the same surveys with a script tag.
        </DocsText>
      </DocsSection>

      <DocsSection id="triggers" sections={SECTIONS}>
        <DocsText>
          Each survey has one trigger, picked in the dashboard. A survey shows
          at most once per page load, and never while another survey is open: a
          trigger that fires meanwhile stays armed.
        </DocsText>
        <ReferenceTable columns={TRIGGER_COLUMNS} rows={TRIGGER_ROWS} />
      </DocsSection>

      <DocsSection id="targeting" sections={SECTIONS}>
        <DocsText>
          The API decides who may see a survey before any trigger fires, so a
          visitor outside the audience never sees it, whichever way it’s
          triggered. A survey counts as seen once its first screen appears.
        </DocsText>
        <ReferenceTable columns={TARGETING_COLUMNS} rows={TARGETING_ROWS} />
      </DocsSection>

      <DocsSection id="use-reflet-surveys" sections={SECTIONS}>
        <DocsText>
          Drive <InlineCode>RefletSurveys</InlineCode> from any component inside
          the provider: send custom events, open a manual survey from a button,
          or close the survey on screen. Calls made before surveys have loaded
          are queued and replayed.
        </DocsText>
        <CodeBlock code={SIGNALS_CODE} />
        <ReferenceTable columns={API_COLUMNS} rows={SURVEYS_API_ROWS} />
      </DocsSection>

      <DocsSection id="callbacks" sections={SECTIONS}>
        <DocsText>
          Forward survey activity to your analytics. Answers arrive one at a
          time as the respondent moves on. <InlineCode>endingId</InlineCode> is
          the ending their answers led to.{" "}
          <InlineCode>onSurveyDismiss</InlineCode> fires only when someone
          closes a survey before finishing it.
        </DocsText>
        <CodeBlock code={CALLBACKS_CODE} />
      </DocsSection>

      <DocsSection id="theming" sections={SECTIONS}>
        <DocsList>
          <li>
            <InlineCode>theme</InlineCode> and{" "}
            <InlineCode>primaryColor</InlineCode> set the look. With a hex
            color, button text switches between dark and white to stay readable.
          </li>
          <li>
            The position (bottom right, bottom left or centered) is set per
            survey in the dashboard.
          </li>
          <li>An ending without a button closes itself after a few seconds.</li>
          <li>
            Respondents can use the keyboard throughout: Enter moves on, Escape
            closes, number keys answer NPS, rating and single-choice questions,
            and Y or N answers yes/no questions.
          </li>
        </DocsList>
      </DocsSection>

      <DocsSection id="custom-ui" sections={SECTIONS}>
        <DocsSubsection id="survey-card" title="Embed the survey card">
          <DocsText>
            <InlineCode>useSurveySession</InlineCode> runs a survey’s flow:
            branching, validation and saving answers. Pass the session to{" "}
            <InlineCode>SurveyCard</InlineCode> to render it anywhere, for
            example inline on a settings page. Inside{" "}
            <InlineCode>RefletProvider</InlineCode>, answers are saved to
            Reflet. The response starts on mount; pass{" "}
            <InlineCode>autoStart: false</InlineCode> to start it yourself.
          </DocsText>
          <CodeBlock code={CARD_CODE} />
          <PropsTable props={CARD_PROPS} />
        </DocsSubsection>

        <DocsSubsection id="headless" title="Build your own UI">
          <DocsText>
            Render the session yourself for complete control. This example
            handles text questions only. A new session begins whenever{" "}
            <InlineCode>survey</InlineCode> or{" "}
            <InlineCode>transport</InlineCode> changes identity, so keep them
            stable.
          </DocsText>
          <CodeBlock code={HEADLESS_CODE} />
          <ReferenceTable columns={API_COLUMNS} rows={SESSION_ROWS} />
        </DocsSubsection>

        <DocsSubsection id="preview" title="Preview without saving">
          <DocsText>
            <InlineCode>reflet-sdk/surveys</InlineCode> exports the same session
            hook and card without needing the provider. With{" "}
            <InlineCode>previewTransport</InlineCode>, nothing is saved, which
            is useful for previews and tests.
          </DocsText>
          <CodeBlock code={PREVIEW_CODE} />
        </DocsSubsection>
      </DocsSection>

      <DocsSection id="javascript-client" sections={SECTIONS}>
        <DocsText>
          The <InlineCode>Reflet</InlineCode> client from{" "}
          <InlineCode>reflet-sdk</InlineCode> wraps the{" "}
          <DocsLink href="/docs/api#eligible-surveys">
            survey endpoints
          </DocsLink>{" "}
          and works without React. It sends the visitor’s anonymous ID, page URL
          and user agent for you. It doesn’t run the branching flow: walk it
          yourself from each question’s <InlineCode>logic</InlineCode> and{" "}
          <InlineCode>next</InlineCode>. Completing fails if a required question
          on the respondent’s path has no answer.
        </DocsText>
        <CodeBlock code={CLIENT_CODE} />
        <ReferenceTable columns={API_COLUMNS} rows={CLIENT_ROWS} />
      </DocsSection>
    </DocsPage>
  );
}
