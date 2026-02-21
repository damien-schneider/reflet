import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import {
  CodeBlock,
  ComponentPreview,
  InstallTabs,
} from "@/components/docs/component-preview";
import { TRACK_VIEW_CODE } from "@/components/docs/milestone-view-codes";
import { TrackViewPreview } from "@/components/docs/milestone-view-previews";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Horizontal Track - Milestone View",
  description:
    "A horizontal track layout grouped by time horizons with pinch-to-zoom support.",
  path: "/docs/components/milestone-views/track",
});

const SOURCE_CODE = readFileSync(
  join(process.cwd(), "../../packages/ui/registry/milestone-track-view.tsx"),
  "utf-8"
);

const IMPORT_CODE = `import { MilestoneTrackView } from "@/components/ui/milestone-track-view";`;

export default function TrackViewPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Horizontal Track
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        The default milestone view. A horizontal track with milestones grouped
        by time horizon, supporting pinch-to-zoom on desktop.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Preview
        </h2>
        <ComponentPreview code={`${IMPORT_CODE}\n\n${TRACK_VIEW_CODE}`}>
          <TrackViewPreview />
        </ComponentPreview>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Installation
        </h2>
        <InstallTabs
          cliCommand="npx shadcn add https://reflet.app/r/milestone-track-view.json"
          manualCode={SOURCE_CODE}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Usage
        </h2>
        <CodeBlock code={IMPORT_CODE} />
        <div className="h-4" />
        <CodeBlock code={TRACK_VIEW_CODE} />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Features
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground text-sm">
          <li>
            Milestones grouped into time horizon zones (Now, Next Month, Next
            Quarter, etc.)
          </li>
          <li>
            Pinch-to-zoom via trackpad (Chrome/Firefox ctrl+wheel, Safari native
            gestures)
          </li>
          <li>
            Each zone grows proportionally — nearer horizons get more visual
            weight
          </li>
          <li>
            Click a milestone to expand details with linked feedback and
            progress ring
          </li>
          <li>
            Admins see &quot;+&quot; buttons to add milestones directly within
            each zone
          </li>
          <li>Responsive: vertical stacked layout on mobile</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Configuration
        </h2>
        <p className="text-muted-foreground text-sm">
          Set{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            milestoneStyle: &quot;track&quot;
          </code>{" "}
          in your organization&apos;s feedback settings, or leave it as the
          default.
        </p>
      </section>
    </div>
  );
}
