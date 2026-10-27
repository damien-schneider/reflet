import type { Metadata } from "next";
import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import { DocsPage, DocsSection, DocsText } from "@/components/docs/docs-page";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Choose live chat, a React feedback launcher, a public feedback board, or a changelog embed.",
  path: "/docs/widget",
  title: "Widgets",
});

const SECTIONS = [
  { id: "widgets", label: "Choose a widget" },
  { id: "access", label: "Keys and access" },
] as const;
const WIDGETS = [
  {
    description:
      "React report launcher with screenshots, annotations and element context. Also provides access to team tools.",
    href: "/docs/widget/floating-feedback",
    title: "Floating feedback",
  },
  {
    description:
      "Script-based public feedback list and submission form, plus the separate React FeedbackButton and FeedbackDialog.",
    href: "/docs/widget/feedback-widget",
    title: "Feedback widget",
  },
  {
    description:
      "Published releases in a card or panel, with browser-local unread state.",
    href: "/docs/widget/changelog-widget",
    title: "Changelog widget",
  },
  {
    description:
      "Visitor conversations with your support team, installed with a widget id.",
    href: "/docs/widget/live-chat",
    title: "Live chat",
  },
] as const;

export default function WidgetOverviewPage() {
  return (
    <DocsPage
      description="Choose a feedback collector, public board, live chat, or changelog embed."
      sections={SECTIONS}
      title="Widgets"
    >
      <DocsSection id="widgets" sections={SECTIONS}>
        <DocsCardGrid headingLevel="h3" items={WIDGETS} />
      </DocsSection>
      <DocsSection id="access" sections={SECTIONS}>
        <DocsText>
          Feedback and changelog use an organization public fb_pub_ key. Live
          chat uses a widget id. Never expose an fb_sec_ key or signing secret.
          Public board and changelog reads require a public organization; report
          submission does not. Verified customer identity and Reflet team
          sign-in are separate flows.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
