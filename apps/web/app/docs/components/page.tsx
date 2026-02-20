import type { Metadata } from "next";
import Link from "next/link";

import {
  CodeBlock,
  ComponentPreview,
} from "@/components/docs/component-preview";
import { AllCardsPreview } from "@/components/docs/feedback-card-previews";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Component Library",
  description:
    "Pre-made UI components for feedback boards, roadmaps, and timelines. Install via shadcn registry.",
  path: "/docs/components",
  keywords: ["components", "shadcn", "registry", "feedback cards", "ui"],
});

const CARDS = [
  {
    title: "Sweep Corner",
    description:
      "Corner vote badge with animated up/down buttons and sweep gradient effect.",
    href: "/docs/components/feedback-cards/sweep-corner",
  },
  {
    title: "Minimal Notch",
    description:
      "Side vote column with an animated glowing notch bar and status badges.",
    href: "/docs/components/feedback-cards/minimal-notch",
  },
  {
    title: "Editorial Feed",
    description:
      "Stacked editorial layout with margin vote annotations and vertical rules.",
    href: "/docs/components/feedback-cards/editorial-feed",
  },
] as const;

const OVERVIEW_CODE = `import {
  SweepCorner,
  SweepCornerBadge,
  SweepCornerCard,
  SweepCornerContent,
  SweepCornerFooter,
  SweepCornerTag,
  SweepCornerTags,
  SweepCornerTitle,
} from "@/components/ui/feedback-sweep-corner";

import {
  MinimalNotch,
  MinimalNotchCard,
  MinimalNotchMeta,
  MinimalNotchStatus,
  MinimalNotchTag,
  MinimalNotchTags,
  MinimalNotchTitle,
  MinimalNotchVote,
} from "@/components/ui/feedback-minimal-notch";

import {
  EditorialFeed,
  EditorialFeedComments,
  EditorialFeedContent,
  EditorialFeedItem,
  EditorialFeedMeta,
  EditorialFeedRule,
  EditorialFeedStatus,
  EditorialFeedTag,
  EditorialFeedTime,
  EditorialFeedTitle,
  EditorialFeedVote,
} from "@/components/ui/feedback-editorial-feed";`;

export default function ComponentsOverviewPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Component Library
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Pre-made UI components you can install directly into your project via
        the shadcn registry. Each component is composable, theme-aware, and
        works with any shadcn-based project.
      </p>

      <div className="mb-8 rounded-lg border border-border bg-muted/30 p-4">
        <h2 className="mb-1 font-semibold text-sm">Quick install</h2>
        <p className="text-muted-foreground text-xs">
          <InlineCode>
            npx shadcn add https://reflet.app/r/feedback-sweep-corner.json
          </InlineCode>
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Feedback Cards
        </h2>
        <p className="mb-6 text-muted-foreground text-sm">
          Three distinct visual styles for displaying feedback items. Each uses
          a composable sub-component API and manages vote state internally via
          React context.
        </p>
        <ComponentPreview code={OVERVIEW_CODE}>
          <AllCardsPreview />
        </ComponentPreview>
      </section>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
            href={card.href}
            key={card.href}
          >
            <h3 className="mb-1 font-semibold text-sm transition-colors group-hover:text-primary">
              {card.title}
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {card.description}
            </p>
          </Link>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Composable API
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Each component exports multiple named sub-components that you compose
          together. This gives you full control over layout and content while
          the root provider manages shared state.
        </p>
        <CodeBlock code={OVERVIEW_CODE} />
      </section>

      <div className="space-y-4">
        <h2 className="font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Getting Started
        </h2>
        <div className="space-y-2 text-muted-foreground text-sm">
          <p>
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              href="/docs/components/installation"
            >
              Installation guide
            </Link>{" "}
            — how to add components to your project.
          </p>
          <p>
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              href="/docs/components/theming"
            >
              Theming guide
            </Link>{" "}
            — how components adapt to your theme via CSS variables.
          </p>
        </div>
      </div>
    </div>
  );
}
