"use client";

import { H2, H3, Lead } from "@/components/ui/typography";
import {
  ChangelogMockup,
  FeedbackBoardMockup,
  RoadmapMockup,
} from "./product-tour-mockups";
import { AIFeaturesMockup, WidgetMockup } from "./product-tour-mockups-extra";

// =============================================================================
// Types
// =============================================================================

interface FeatureSection {
  badge: string;
  description: string;
  id: string;
  mockup: React.ReactNode;
  reverse: boolean;
  title: string;
}

// =============================================================================
// Feedback Board Mockup
// =============================================================================

// =============================================================================
// Feature Block Layout
// =============================================================================

interface FeatureBlockProps {
  badge: string;
  description: string;
  mockup: React.ReactNode;
  reverse: boolean;
  title: string;
}

function FeatureBlock({
  badge,
  title,
  description,
  mockup,
  reverse,
}: FeatureBlockProps) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div className={reverse ? "lg:order-2" : ""}>
        <span className="mb-4 inline-block rounded-full bg-primary/10 px-3.5 py-1 font-semibold text-primary text-xs uppercase tracking-wide">
          {badge}
        </span>
        <H3 className="mb-4">{title}</H3>
        <p className="max-w-lg text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <div className="relative">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-primary/[0.03] blur-2xl" />
          <div className="relative">{mockup}</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sections Data
// =============================================================================

const SECTIONS: FeatureSection[] = [
  {
    badge: "Feedback Collection",
    description:
      "Users submit ideas and vote on what matters most. AI auto-tags, estimates complexity, and detects duplicates so your team focuses on what counts.",
    id: "feedback-board",
    mockup: <FeedbackBoardMockup />,
    reverse: false,
    title: "Every feature request, organized and prioritized",
  },
  {
    badge: "Visual Roadmap",
    description:
      "Drag-and-drop kanban board with custom statuses. Share publicly to build trust, or keep internal for planning.",
    id: "roadmap",
    mockup: <RoadmapMockup />,
    reverse: true,
    title: "A roadmap your team and users can actually follow",
  },
  {
    badge: "Changelog",
    description:
      "Publish beautiful release notes linked to the feedback that inspired them. Users get notified when their request ships.",
    id: "changelog",
    mockup: <ChangelogMockup />,
    reverse: false,
    title: "Close the loop with every release",
  },
  {
    badge: "Developer Experience",
    description:
      "Drop-in widget via script tag, or go deep with React hooks. TypeScript-first SDK with useFeedbackList(), useVote(), and more.",
    id: "widget-sdk",
    mockup: <WidgetMockup />,
    reverse: true,
    title: "Embed feedback anywhere with one line of code",
  },
  {
    badge: "AI-Powered",
    description:
      "Automatic tagging, priority estimation, complexity scoring, and duplicate detection. Your team triages in minutes, not hours.",
    id: "ai-features",
    mockup: <AIFeaturesMockup />,
    reverse: false,
    title: "Let AI handle the busywork",
  },
];

// =============================================================================
// Main Component
// =============================================================================

export default function ProductTour() {
  return (
    <section className="relative overflow-hidden bg-background px-4 py-32 sm:px-6 lg:px-8">
      {/* Ambient background blurs */}
      <div className="pointer-events-none absolute top-0 left-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/[0.02] blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-3xl" />

      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-24 text-center">
          <span className="mb-4 inline-block font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Product Tour
          </span>
          <H2 variant="section">See how Reflet works</H2>
          <Lead className="mx-auto mt-4 max-w-2xl">
            From collecting feedback to shipping features your users actually
            want.
          </Lead>
        </div>

        {/* Feature blocks */}
        <div className="space-y-32">
          {SECTIONS.map((section) => (
            <FeatureBlock
              badge={section.badge}
              description={section.description}
              key={section.id}
              mockup={section.mockup}
              reverse={section.reverse}
              title={section.title}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
