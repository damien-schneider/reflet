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
  src="https://cdn.reflet.app/widget/reflet-changelog.v1.js"
  data-public-key="fb_pub_xxx"
  data-mode="trigger"
  async
></script>

<button data-reflet-changelog>
  What's new <span data-reflet-changelog-badge></span>
</button>`;

const REACT_USAGE = `import { ChangelogWidget } from "reflet-sdk/react";

function App() {
  return (
    <>
      <ChangelogWidget publicKey="fb_pub_xxx" mode="trigger" />
      <button data-reflet-changelog>What's new</button>
    </>
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
      "data-public-key / publicKey",
      "string",
      "Your organization’s public API key. Required.",
    ],
    key: "public-key",
  },
  {
    cells: [
      "data-mode / mode",
      '"card" | "popup" | "trigger"',
      "Floating card, modal popup, or dropdown attached to trigger elements. Defaults to card.",
    ],
    key: "mode",
  },
  {
    cells: [
      "data-trigger-selector / triggerSelector",
      "CSS selector",
      "Elements that open the widget in trigger mode. Defaults to [data-reflet-changelog].",
    ],
    key: "trigger-selector",
  },
  {
    cells: [
      "data-max-entries / maxEntries",
      "number",
      "Maximum number of entries shown. Defaults to 10.",
    ],
    key: "max-entries",
  },
  {
    cells: [
      "data-position / position",
      '"bottom-right" | "bottom-left"',
      "Corner used by card and popup modes. Defaults to bottom-right.",
    ],
    key: "position",
  },
  {
    cells: [
      "data-theme / theme",
      '"light" | "dark" | "auto"',
      "Color theme. Defaults to light.",
    ],
    key: "theme",
  },
  {
    cells: [
      "data-color / primaryColor",
      "CSS color",
      "Brand color for accents and badges.",
    ],
    key: "color",
  },
  {
    cells: [
      "data-auto-open / autoOpenForNew",
      "boolean",
      "Open automatically when there are unread entries.",
    ],
    key: "auto-open",
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
          Add this script tag. Any element with the data-reflet-changelog
          attribute opens the widget, and an inner data-reflet-changelog-badge
          element shows the unread count.
        </DocsText>
        <CodeBlock code={SCRIPT_TAG} />
      </DocsSection>

      <DocsSection id="react" sections={SECTIONS}>
        <DocsText>
          In React projects, render the SDK’s ChangelogWidget with your public
          key. It loads the same script and accepts the same options as props.
        </DocsText>
        <CodeBlock code={REACT_USAGE} />
      </DocsSection>

      <DocsSection id="features" sections={SECTIONS}>
        <DocsList>
          <li>
            Each entry shows its version, date, title, description and the
            feedback it shipped.
          </li>
          <li>An unread badge counts the entries the visitor hasn’t seen.</li>
          <li>
            Read state is stored in the browser and survives new sessions.
          </li>
          <li>
            window.Reflet("open_changelog") and window.Reflet("close_changelog")
            control the widget from your code.
          </li>
        </DocsList>
      </DocsSection>

      <DocsSection id="configuration" sections={SECTIONS}>
        <ReferenceTable columns={COLUMNS} rows={ROWS} />
      </DocsSection>
    </DocsPage>
  );
}
