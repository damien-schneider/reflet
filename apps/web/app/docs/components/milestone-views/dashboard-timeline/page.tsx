import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import {
  CodeBlock,
  ComponentPreview,
  InstallTabs,
} from "@/components/docs/component-preview";
import { DASHBOARD_TIMELINE_CODE } from "@/components/docs/milestone-view-codes";
import { DashboardTimelinePreview } from "@/components/docs/milestone-view-previews";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Dashboard Timeline - Milestone View",
  description:
    "A KPI summary bar with vertical timeline and sweep animation on click.",
  path: "/docs/components/milestone-views/dashboard-timeline",
});

const SOURCE_CODE = readFileSync(
  join(
    process.cwd(),
    "../../packages/ui/registry/milestone-dashboard-timeline.tsx"
  ),
  "utf-8"
);

const IMPORT_CODE = `import { MilestoneDashboardTimeline } from "@/components/ui/milestone-dashboard-timeline";`;

export default function DashboardTimelinePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Dashboard Timeline
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A data-rich view combining a KPI summary bar with a vertical timeline
        and satisfying sweep animation on milestone selection.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Preview
        </h2>
        <ComponentPreview code={`${IMPORT_CODE}\n\n${DASHBOARD_TIMELINE_CODE}`}>
          <DashboardTimelinePreview />
        </ComponentPreview>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Installation
        </h2>
        <InstallTabs
          cliCommand="npx shadcn add https://reflet.app/r/milestone-dashboard-timeline.json"
          manualCode={SOURCE_CODE}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Usage
        </h2>
        <CodeBlock code={IMPORT_CODE} />
        <div className="h-4" />
        <CodeBlock code={DASHBOARD_TIMELINE_CODE} />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Features
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground text-sm">
          <li>
            KPI header bar with overall progress ring, item counts, and
            done/in-progress breakdown
          </li>
          <li>Vertical timeline with colored dot nodes on a left spine</li>
          <li>
            Multi-segment progress bars showing completed (green) and
            in-progress (primary) segments
          </li>
          <li>
            Sweep animation on click — a colored overlay sweeps horizontally
            across the row for tactile feedback
          </li>
          <li>
            Accordion expansion showing linked feedback, progress details, and
            admin actions
          </li>
          <li>Horizon badges and percentage indicators for quick scanning</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Configuration
        </h2>
        <p className="text-muted-foreground text-sm">
          Set{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            milestoneStyle: &quot;dashboard-timeline&quot;
          </code>{" "}
          in your organization&apos;s feedback settings.
        </p>
      </section>
    </div>
  );
}
