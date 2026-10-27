import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Embed a feedback board, identify visitors, trigger surveys, or use a React submission dialog.",
  path: "/docs/widget/feedback-widget",
  title: "Feedback widget",
});

const SECTIONS = [
  { id: "script-tag", label: "Embed the board" },
  { id: "configuration", label: "Configuration" },
  { id: "user-identification", label: "Identity and access" },
  { id: "api", label: "Methods and callbacks" },
  { id: "surveys", label: "Surveys" },
  { id: "react", label: "React submission dialog" },
  { id: "limits", label: "Limits and privacy" },
] as const;

const EMBED = `<script>
  window.RefletFeedbackConfig = {
    publicKey: "fb_pub_xxx",
    theme: "auto",
    features: {
      createFeedback: true,
      voting: true,
      surveys: true
    }
  };
</script>
<script src="https://www.reflet.app/widget/reflet-feedback.v1.js" async></script>`;

const INLINE = `<div id="feedback-board"></div>
<script>
  window.RefletFeedbackConfig = {
    publicKey: "fb_pub_xxx",
    mode: "inline",
    targetId: "feedback-board",
    features: { createFeedback: true, voting: true }
  };
</script>
<script src="https://www.reflet.app/widget/reflet-feedback.v1.js" async></script>`;

const OPTIONS = [
  ["publicKey", "string, required", "Organization fb_pub_ key."],
  [
    "mode",
    '"floating" | "inline"',
    "Default floating. Inline attaches a closed shadow root to targetId; the target must exist before initialization.",
  ],
  [
    "targetId",
    "string",
    "Existing element id for inline mode. A missing target falls back to a body-mounted container.",
  ],
  [
    "position",
    '"bottom-right" | "bottom-left"',
    "Default bottom-right; used by floating mode.",
  ],
  [
    "theme",
    '"light" | "dark" | "auto"',
    "Default light. Auto resolves the system preference at initialization.",
  ],
  [
    "primaryColor",
    "CSS color",
    "Accent color. Host CSS does not reach the shadow root.",
  ],
  [
    "userToken",
    "string",
    "Verified token signed by your server. Takes precedence over user.",
  ],
  [
    "user",
    "{ id, email?, name?, avatar? }",
    "Unsigned browser identity; not authorization for votes or comments.",
  ],
  [
    "loginUrl",
    "string",
    "Redirect for sign-in. Optional {url} placeholder receives the encoded current page URL.",
  ],
  [
    "features.createFeedback / voting",
    "boolean",
    "Show the creation action and list vote buttons. Set these explicitly; supplied feature objects are not deep-merged.",
  ],
  [
    "features.surveys",
    "boolean",
    "Automatic survey delivery is on unless false. Independent of board visibility.",
  ],
] as const;

const METHODS = `// Run after the script has loaded and initialized.
const widget = window.__refletFeedbackWidgetInstance;
widget.open();
widget.close();
widget.track("checkout_completed");
const shown = await widget.showSurvey("survey_id");
widget.dismissSurvey();
// Remove a floating widget when its host page unmounts.
widget.destroy();`;

const REACT = `"use client";

import { FeedbackButton } from "reflet-sdk/react";

export function SendFeedback() {
  return <FeedbackButton publicKey="fb_pub_xxx" />;
}`;

const DIALOG = `"use client";

import { useState } from "react";
import { FeedbackDialog } from "reflet-sdk/react";

export function SendFeedback() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Send feedback</button>
      <FeedbackDialog
        publicKey="fb_pub_xxx"
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}`;

export default function FeedbackWidgetPage() {
  return (
    <DocsPage
      description="The script widget shows a public feedback list, item details and a submission form. The SDK also has a smaller React-only submission dialog; it is not the same UI."
      sections={SECTIONS}
      title="Feedback widget"
    >
      <DocsSection id="script-tag" sections={SECTIONS}>
        <DocsText>
          Create a public API key for a public organization, replace fb_pub_xxx,
          and place the config before the loader. The floating button appears
          after the board configuration loads.
        </DocsText>
        <CodeBlock code={EMBED} />
        <DocsText>
          Use a global config for a loader in the document head as well as at
          the end of the body. window.Reflet takes precedence over
          window.RefletFeedbackConfig; do not define both for this widget.
        </DocsText>
        <DocsText>To display the board in a page region instead:</DocsText>
        <CodeBlock code={INLINE} />
      </DocsSection>
      <DocsSection id="configuration" sections={SECTIONS}>
        <ReferenceTable
          columns={[
            { kind: "name", label: "Option" },
            { kind: "code", label: "Value" },
            { kind: "text", label: "Behavior" },
          ]}
          rows={OPTIONS.map(([name, type, description]) => ({
            cells: [name, type, description],
            key: name,
          }))}
        />
        <DocsText>
          The loader also reads data-public-key, data-mode, data-position,
          data-theme and data-color from its script when initialization runs
          during script execution. It does not read data-key, user attributes or
          data-target-id. Global config avoids dependence on
          document.currentScript timing.
        </DocsText>
        <DocsText>
          The type includes portal, locale, comments, roadmap and changelog
          options, but these are not complete controls in the current renderer.
          Portal has no automatic launcher, locale does not translate labels,
          comments are still rendered in details, and roadmap/changelog tabs
          reuse the feedback list. Do not use them as separate views or access
          controls.
        </DocsText>
      </DocsSection>
      <DocsSection id="user-identification" sections={SECTIONS}>
        <DocsText>
          The creation form requires user or userToken in config. Votes and
          comments require a verified signed userToken, not an unsigned user
          object. Generate the token on your server from the authenticated
          session, then include it in the config. Follow{" "}
          <DocsLink href="/docs/sdk/installation#user-signing">
            user signing
          </DocsLink>
          ; never expose the signing secret.
        </DocsText>
        <DocsText>
          Public keys cannot read a private organization's board. The board UI
          stays hidden if configuration fails; surveys can still run. For
          anonymous reports or a private organization, use{" "}
          <DocsLink href="/docs/widget/floating-feedback">
            floating feedback
          </DocsLink>{" "}
          or the React dialog below.
        </DocsText>
      </DocsSection>
      <DocsSection id="api" sections={SECTIONS}>
        <CodeBlock code={METHODS} />
        <DocsText>
          Set onOpen() and onClose() in the initial config for lifecycle events,
          onVote(feedbackId, voted) after a successful vote, and
          onFeedbackCreated(result) after creation. The result contains id and
          title. Callbacks are functions in global config, not script
          attributes. There is no runtime identity/config setter: recreate the
          widget when the signed-in account changes.
        </DocsText>
      </DocsSection>
      <DocsSection id="surveys" sections={SECTIONS}>
        <DocsText>
          Automatic delivery checks survey eligibility and triggers.
          track(eventName) fires custom-event triggers. showSurvey(id) returns
          Promise&lt;boolean&gt; and can show a manual survey; false means it
          cannot show now. Only one survey opens at a time. dismissSurvey()
          closes it and records dismissal.
        </DocsText>
        <DocsText>
          The survey config accepts onSurveyStart, onQuestionAnswer,
          onSurveyComplete and onSurveyDismiss callbacks. Each receives an
          object with surveyId and event-specific fields: responseId/title,
          questionId/value, responseId/endingId, or responseId/answeredCount,
          respectively. Dismissed responseId can be null. For trigger rules,
          respondent storage and custom React UI, see{" "}
          <DocsLink href="/docs/sdk/surveys">surveys</DocsLink>.
        </DocsText>
      </DocsSection>
      <DocsSection id="react" sections={SECTIONS}>
        <InstallCommand command="npm install reflet-sdk" />
        <CodeBlock code={REACT} />
        <DocsText>
          FeedbackButton renders an inline trigger and a native dialog, not a
          floating board. It collects a required title and optional
          description/email, without screenshot or element capture. publicKey,
          user and userToken can come from RefletProvider. For controlled
          visibility:
        </DocsText>
        <CodeBlock code={DIALOG} />
        <DocsText>
          Both accept theme (default auto), primaryColor, labels, baseUrl,
          onOpen, onClose and onSubmit(result). FeedbackButton also accepts
          className, children and asChild. With asChild, pass one accessible
          button; the component replaces that child's onClick rather than
          composing it. FeedbackDialog requires open and onOpenChange.
        </DocsText>
      </DocsSection>
      <DocsSection id="limits" sections={SECTIONS}>
        <DocsList>
          <li>
            The board loads up to 50 feedback items sorted by votes. It has no
            pagination control.
          </li>
          <li>
            The script creation form requires both title and description. Failed
            submissions show the API error. An attachment upload failure does
            not undo a created report.
          </li>
          <li>
            Script screenshots serialize page HTML into an image. They do not
            use the floating React widget's markup filters or annotation tools.
            Check for sensitive content before offering capture.
          </li>
          <li>
            Floating mode manages focus and Escape dismissal. Inline mode is not
            a modal. Keep the target visible and give its surrounding region an
            accessible heading.
          </li>
          <li>
            Use one instance. With a changelog embed, initialize feedback first:
            changelog replaces window.Reflet and can prevent feedback's global
            config fallback from being read.
          </li>
        </DocsList>
        <DocsText>
          For origin restrictions and API errors, see the{" "}
          <DocsLink href="/docs/api">API reference</DocsLink>.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
