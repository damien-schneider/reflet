import type { Metadata } from "next";

import { CodeBlock } from "@/components/docs/code-block";
import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import { DocsPage, DocsSection, DocsText } from "@/components/docs/docs-page";
import { AllCardsPreview } from "@/components/docs/feedback-card-previews";
import { InstallCommand } from "@/components/docs/install-command";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Pre-made UI components for feedback boards, roadmaps, and timelines. Install via shadcn registry.",
  keywords: ["components", "shadcn", "registry", "feedback cards", "ui"],
  path: "/docs/components",
  title: "Component library",
});

const SECTIONS = [
  { id: "quick-install", label: "Quick install" },
  { id: "feedback-cards", label: "Feedback cards" },
  { id: "milestone-views", label: "Milestone views" },
  { id: "composable-api", label: "Composable API" },
  { id: "get-started", label: "Get started" },
] as const;

const CARDS = [
  {
    description:
      "Corner vote badge with animated buttons and a gradient sweep on vote.",
    href: "/docs/components/feedback-cards/sweep-corner",
    title: "Sweep Corner",
  },
  {
    description: "Side vote column with a notch bar that lights up on vote.",
    href: "/docs/components/feedback-cards/minimal-notch",
    title: "Minimal Notch",
  },
  {
    description: "Stacked editorial list with votes set in the margin.",
    href: "/docs/components/feedback-cards/editorial-feed",
    title: "Editorial Feed",
  },
] as const;

const GUIDES = [
  {
    description: "Add components to your project with the shadcn CLI.",
    href: "/docs/components/installation",
    title: "Installation",
  },
  {
    description: "How the components pick up your theme’s CSS variables.",
    href: "/docs/components/theming",
    title: "Theming",
  },
] as const;

const COMPOSE_CODE = `<SweepCorner defaultUpvotes={42}>
  <SweepCornerCard>
    <SweepCornerContent>
      <SweepCornerTitle>Add dark mode</SweepCornerTitle>
    </SweepCornerContent>
    <SweepCornerBadge />
    <SweepCornerFooter comments={5} time="2 days ago" />
  </SweepCornerCard>
</SweepCorner>`;

export default function ComponentsOverviewPage() {
  return (
    <DocsPage
      description="Components you install straight into your project from the shadcn registry. Each one is composable, follows your theme and works in any shadcn-based project."
      sections={SECTIONS}
      title="Component library"
    >
      <DocsSection id="quick-install" sections={SECTIONS}>
        <InstallCommand command="npx shadcn add https://www.reflet.app/r/feedback-sweep-corner.json" />
      </DocsSection>

      <DocsSection id="feedback-cards" sections={SECTIONS}>
        <DocsText>
          Three visual styles for feedback items. Each keeps its vote state in
          React context and exposes composable subcomponents.
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
                "Three ways to show roadmap milestones: a track, an accordion and a timeline.",
              href: "/docs/components/milestone-views",
              title: "Milestone views",
            },
          ]}
        />
      </DocsSection>

      <DocsSection id="composable-api" sections={SECTIONS}>
        <DocsText>
          Each component exports named subcomponents that you arrange yourself.
          You control layout and content while the root keeps the shared state.
        </DocsText>
        <CodeBlock code={COMPOSE_CODE} />
      </DocsSection>

      <DocsSection id="get-started" sections={SECTIONS}>
        <DocsCardGrid headingLevel="h3" items={GUIDES} />
      </DocsSection>
    </DocsPage>
  );
}
