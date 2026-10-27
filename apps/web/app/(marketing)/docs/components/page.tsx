import type { Metadata } from "next";
import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import { DocsPage, DocsSection, DocsText } from "@/components/docs/docs-page";
import { AllCardsPreview } from "@/components/docs/feedback-card-previews";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Editable React feedback cards and milestone views from the Reflet shadcn registry.",
  path: "/docs/components",
  title: "Components",
});
const SECTIONS = [
  { id: "get-started", label: "Get started" },
  { id: "feedback-cards", label: "Feedback cards" },
  { id: "milestone-views", label: "Milestone views" },
] as const;
const CARDS = [
  {
    description: "Card with a corner vote badge and footer totals.",
    href: "/docs/components/feedback-cards/sweep-corner",
    title: "Sweep corner",
  },
  {
    description: "Card with a separate side vote column and status pill.",
    href: "/docs/components/feedback-cards/minimal-notch",
    title: "Minimal notch",
  },
  {
    description: "Feedback rows with votes in the margin.",
    href: "/docs/components/feedback-cards/editorial-feed",
    title: "Editorial feed",
  },
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
          Each style has composable parts and local or controlled vote state.
          These previews are local demos; voting does not call Reflet.
        </DocsText>
        <div className="rounded-lg border border-border bg-background p-4 sm:p-6">
          <AllCardsPreview />
        </div>
        <DocsCardGrid headingLevel="h3" items={CARDS} />
      </DocsSection>
      <DocsSection id="milestone-views" sections={SECTIONS}>
        <DocsCardGrid
          headingLevel="h3"
          items={[
            {
              description:
                "Choose a track, accordion or timeline and supply the shared milestone data shape.",
              href: "/docs/components/milestone-views",
              title: "Milestone views",
            },
          ]}
        />
      </DocsSection>
    </DocsPage>
  );
}
