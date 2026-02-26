import type { Metadata } from "next";
import Link from "next/link";

import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Widgets Overview",
  description:
    "Drop-in feedback and changelog widgets for your website. Embed with a single script tag.",
  path: "/docs/widget",
  keywords: ["widget", "feedback widget", "changelog widget", "embed"],
});

export default function WidgetOverviewPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Widgets
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Drop-in widgets that embed directly into your website. Add feedback
        collection or changelog announcements with minimal code.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
          href="/docs/widget/feedback-widget"
        >
          <h2 className="mb-1 font-semibold text-sm transition-colors group-hover:text-primary">
            Feedback Widget
          </h2>
          <p className="text-muted-foreground text-xs leading-relaxed">
            A floating button that opens a feedback form. Collects feature
            requests, bug reports, and general feedback.
          </p>
        </Link>
        <Link
          className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
          href="/docs/widget/changelog-widget"
        >
          <h2 className="mb-1 font-semibold text-sm transition-colors group-hover:text-primary">
            Changelog Widget
          </h2>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Shows recent changelog entries in a popover. Highlights unread
            updates with a notification badge.
          </p>
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          How widgets work
        </h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>
            Widgets are framework-agnostic — they work with React, Vue, plain
            HTML, or any stack
          </li>
          <li>Each widget loads as a self-contained bundle via a script tag</li>
          <li>
            Widgets connect to your Reflet organization using your public API
            key
          </li>
          <li>
            For React projects, dedicated components are available via the SDK
          </li>
        </ul>
      </section>
    </div>
  );
}
