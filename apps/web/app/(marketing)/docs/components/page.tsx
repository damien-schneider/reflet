import type { Metadata } from "next";
import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import {
  DocsLink,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { SweepCornerPreview } from "@/components/docs/feedback-card-previews";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Sweep corner feedback cards and the Horizontal track milestone view for React.",
  path: "/docs/components",
  title: "Components",
});
const SECTIONS = [
  { id: "get-started", label: "Get started" },
  { id: "feedback-cards", label: "Feedback cards" },
  { id: "milestone-views", label: "Milestone views" },
] as const;

export default function ComponentsOverviewPage() {
  return (
    <DocsPage
      description="Copy React components into your app through the shadcn registry. You own the source, data fetching and persistence. No API key is needed to render them."
      sections={SECTIONS}
      title="Components"
    >
      <DocsSection id="get-started" sections={SECTIONS}>
        <DocsCardGrid
          headingLevel="h3"
          items={[
            {
              description:
                "Prerequisites, one install command and a working card.",
              href: "/docs/components/installation",
              title: "Installation",
            },
            {
              description:
                "Theme tokens, colors and accessibility when customizing.",
              href: "/docs/components/theming",
              title: "Theming",
            },
          ]}
        />
      </DocsSection>
      <DocsSection id="feedback-cards" sections={SECTIONS}>
        <DocsText>
          The preview uses local vote state; voting does not call Reflet.
        </DocsText>
        <div className="rounded-lg border border-border bg-background p-4 sm:p-6">
          <SweepCornerPreview />
        </div>
        <DocsText>
          <DocsLink href="/docs/components/feedback-cards/sweep-corner">
            Install Sweep corner
          </DocsLink>
        </DocsText>
      </DocsSection>
      <DocsSection id="milestone-views" sections={SECTIONS}>
        <DocsCardGrid
          headingLevel="h3"
          items={[
            {
              description: "Group milestones by time horizon.",
              href: "/docs/components/milestone-views",
              title: "Horizontal track",
            },
          ]}
        />
      </DocsSection>
    </DocsPage>
  );
}
