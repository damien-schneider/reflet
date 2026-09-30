import type { Metadata } from "next";

import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import { DocsList, DocsPage, DocsSection } from "@/components/docs/docs-page";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Drop-in feedback and changelog widgets for your website. Embed with a single script tag.",
  keywords: ["widget", "feedback widget", "changelog widget", "embed"],
  path: "/docs/widget",
  title: "Widgets overview",
});

const SECTIONS = [
  { id: "widgets", label: "Available widgets" },
  { id: "how-it-works", label: "How widgets work" },
] as const;

const WIDGETS = [
  {
    description:
      "A React component that files reports with a screenshot, drawings and the element the user pointed at.",
    href: "/docs/widget/floating-feedback",
    title: "Floating feedback button",
  },
  {
    description:
      "A script-tag button that opens a form for feature requests, bug reports and general feedback.",
    href: "/docs/widget/feedback-widget",
    title: "Feedback widget",
  },
  {
    description:
      "Recent changelog entries in a popover, with a badge for unread updates.",
    href: "/docs/widget/changelog-widget",
    title: "Changelog widget",
  },
] as const;

export default function WidgetOverviewPage() {
  return (
    <DocsPage
      description="Drop-in widgets that embed directly into your website. Add feedback collection or changelog announcements with a few lines of code."
      sections={SECTIONS}
      title="Widgets"
    >
      <DocsSection id="widgets" sections={SECTIONS}>
        <DocsCardGrid headingLevel="h3" items={WIDGETS} />
      </DocsSection>

      <DocsSection id="how-it-works" sections={SECTIONS}>
        <DocsList>
          <li>
            Framework-agnostic: they work with React, Vue, plain HTML or any
            other stack.
          </li>
          <li>
            Each widget loads as a self-contained bundle from a script tag.
          </li>
          <li>
            Widgets connect to your organization with your public API key.
          </li>
          <li>React projects can use dedicated components from the SDK.</li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
