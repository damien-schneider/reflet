import type { Metadata } from "next";

import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Display recent changelog entries in a popover with unread notification badges.",
  path: "/docs/widget/changelog-widget",
  title: "Changelog widget",
});

const SECTIONS = [
  { id: "script-tag", label: "Script tag embed" },
  { id: "react", label: "React component" },
  { id: "features", label: "Features" },
  { id: "configuration", label: "Configuration" },
] as const;

const SCRIPT_TAG = `<script
  src="https://www.reflet.app/widget/changelog.js"
  data-key="fb_pub_xxx"
  data-trigger="changelog-button"
  async
></script>

<button id="changelog-button">What's new</button>`;

const REACT_USAGE = `import { RefletProvider, ChangelogWidget } from "reflet-sdk/react";

function App() {
  return (
    <RefletProvider publicKey="fb_pub_xxx">
      <ChangelogWidget>
        <button>What's new</button>
      </ChangelogWidget>
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
      "data-trigger / trigger",
      "string (element ID)",
      "ID of the element that opens the popover. Script tag only.",
    ],
    key: "trigger",
  },
  {
    cells: [
      "data-limit / limit",
      "number",
      "Maximum number of entries shown. Defaults to 10.",
    ],
    key: "limit",
  },
] as const;

export default function ChangelogWidgetPage() {
  return (
    <DocsPage
      description="Show recent updates in a popover. A badge counts the entries each visitor hasn’t read yet."
      sections={SECTIONS}
      title="Changelog widget"
    >
      <DocsSection id="script-tag" sections={SECTIONS}>
        <DocsText>
          Add this script tag, then point it at the button that should open the
          popover.
        </DocsText>
        <CodeBlock code={SCRIPT_TAG} />
      </DocsSection>

      <DocsSection id="react" sections={SECTIONS}>
        <DocsText>
          In React projects, wrap your trigger in the SDK’s ChangelogWidget
          component.
        </DocsText>
        <CodeBlock code={REACT_USAGE} />
      </DocsSection>

      <DocsSection id="features" sections={SECTIONS}>
        <DocsList>
          <li>
            The popover lists recent entries with title, description and date.
          </li>
          <li>An unread badge counts the entries the visitor hasn’t seen.</li>
          <li>
            Read state is stored in the browser and survives new sessions.
          </li>
          <li>Each entry links back to the full changelog page.</li>
        </DocsList>
      </DocsSection>

      <DocsSection id="configuration" sections={SECTIONS}>
        <ReferenceTable columns={COLUMNS} rows={ROWS} />
      </DocsSection>
    </DocsPage>
  );
}
