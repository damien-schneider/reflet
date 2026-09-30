import type { Metadata } from "next";

import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import { DocsPage, DocsSection, DocsText } from "@/components/docs/docs-page";
import { AllMilestoneViewsPreview } from "@/components/docs/milestone-view-previews";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Three visual styles for displaying milestone timelines on your feedback board.",
  keywords: ["milestones", "timeline", "views", "roadmap", "progress"],
  path: "/docs/components/milestone-views",
  title: "Milestone views",
});

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "views", label: "Views" },
] as const;

const VIEWS = [
  {
    description: "Milestones on a horizontal track, grouped by time horizon.",
    href: "/docs/components/milestone-views/track",
    title: "Horizontal Track",
  },
  {
    description:
      "Serif list with a percentage column. Open a row for its progress ring.",
    href: "/docs/components/milestone-views/editorial-accordion",
    title: "Editorial Accordion",
  },
  {
    description: "Summary bar of overall progress above a vertical timeline.",
    href: "/docs/components/milestone-views/dashboard-timeline",
    title: "Dashboard Timeline",
  },
] as const;

export default function MilestoneViewsPage() {
  return (
    <DocsPage
      description="Three visual styles for milestone timelines. Each renders the same milestone data."
      sections={SECTIONS}
      title="Milestone views"
    >
      <DocsSection id="overview" sections={SECTIONS}>
        <DocsText>
          In Reflet, admins pick a style in Settings → Feedback Display, and it
          applies to both the dashboard and the public board. Installed from the
          registry, each view is a standalone component you render yourself.
        </DocsText>
        <div className="rounded-lg border border-border bg-background p-4 sm:p-6">
          <AllMilestoneViewsPreview />
        </div>
      </DocsSection>

      <DocsSection id="views" sections={SECTIONS}>
        <DocsCardGrid headingLevel="h3" items={VIEWS} />
      </DocsSection>
    </DocsPage>
  );
}
