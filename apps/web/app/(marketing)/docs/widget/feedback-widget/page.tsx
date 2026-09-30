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
    </DocsPage>
  );
}
