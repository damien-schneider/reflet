import type { Metadata } from "next";
import Link from "next/link";

import { AllMilestoneViewsPreview } from "@/components/docs/milestone-view-previews";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Milestone Views",
  description:
    "Three visual styles for displaying milestone timelines on your feedback board.",
  path: "/docs/components/milestone-views",
  keywords: ["milestones", "timeline", "views", "roadmap", "progress"],
});

const VIEWS = [
  {
    title: "Horizontal Track",
    description:
      "Default horizontal track grouped by time horizons with pinch-to-zoom support.",
    href: "/docs/components/milestone-views/track",
  },
  {
    title: "Editorial Accordion",
    description:
      "Serif typography with a percentage column and color-wash accordion expansion.",
    href: "/docs/components/milestone-views/editorial-accordion",
  },
  {
    title: "Dashboard Timeline",
    description:
      "KPI summary bar at top with a vertical timeline and sweep animation on click.",
    href: "/docs/components/milestone-views/dashboard-timeline",
  },
] as const;

export default function MilestoneViewsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Milestone Views
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Three visual styles for displaying milestone timelines. Each style can
        be configured per-organization in the dashboard settings.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Overview
        </h2>
        <p className="mb-6 text-muted-foreground text-sm">
          Each view renders the same milestone data with a different visual
          treatment. Admins can switch between styles in Settings &rarr;
          Feedback Display. The selected style applies to both the dashboard and
          public board.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex min-h-[200px] items-center justify-center bg-background p-8">
            <AllMilestoneViewsPreview />
          </div>
        </div>
      </section>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {VIEWS.map((view) => (
          <Link
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
            href={view.href}
            key={view.href}
          >
            <h3 className="mb-1 font-semibold text-sm transition-colors group-hover:text-primary">
              {view.title}
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {view.description}
            </p>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Configuration
        </h2>
        <div className="space-y-2 text-muted-foreground text-sm">
          <p>
            The milestone view style is stored in your organization&apos;s{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              feedbackSettings.milestoneStyle
            </code>{" "}
            field. The default is{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              &quot;track&quot;
            </code>
            .
          </p>
          <p>
            Navigate to{" "}
            <strong>Dashboard &rarr; Settings &rarr; Feedback Display</strong>{" "}
            to change the milestone view style for your organization.
          </p>
        </div>
      </section>
    </div>
  );
}
