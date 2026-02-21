import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import {
  CodeBlock,
  ComponentPreview,
  InstallTabs,
} from "@/components/docs/component-preview";
import { EDITORIAL_ACCORDION_CODE } from "@/components/docs/milestone-view-codes";
import { EditorialAccordionPreview } from "@/components/docs/milestone-view-previews";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Editorial Accordion - Milestone View",
  description:
    "A serif-typography accordion view with percentage columns and color-wash expansion.",
  path: "/docs/components/milestone-views/editorial-accordion",
});

const SOURCE_CODE = readFileSync(
  join(
    process.cwd(),
    "../../packages/ui/registry/milestone-editorial-accordion.tsx"
  ),
  "utf-8"
);

const IMPORT_CODE = `import { MilestoneEditorialAccordion } from "@/components/ui/milestone-editorial-accordion";`;

export default function EditorialAccordionPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Editorial Accordion
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A refined editorial layout with serif typography, a left-aligned
        percentage column, and color-wash accordion expansion.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Preview
        </h2>
        <ComponentPreview
          code={`${IMPORT_CODE}\n\n${EDITORIAL_ACCORDION_CODE}`}
        >
          <EditorialAccordionPreview />
        </ComponentPreview>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Installation
        </h2>
        <InstallTabs
          cliCommand="npx shadcn add https://reflet.app/r/milestone-editorial-accordion.json"
          manualCode={SOURCE_CODE}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Usage
        </h2>
        <CodeBlock code={IMPORT_CODE} />
        <div className="h-4" />
        <CodeBlock code={EDITORIAL_ACCORDION_CODE} />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Features
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground text-sm">
          <li>Vertical list with divide lines between milestones</li>
          <li>Left column shows completion percentage in colored mono font</li>
          <li>
            Serif typography for milestone names and metadata for an editorial
            feel
          </li>
          <li>Color-wash background animation when expanding a milestone</li>
          <li>Progress bar and progress ring visible in expanded state</li>
          <li>
            Linked feedback and admin actions available in the expanded panel
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Configuration
        </h2>
        <p className="text-muted-foreground text-sm">
          Set{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            milestoneStyle: &quot;editorial-accordion&quot;
          </code>{" "}
          in your organization&apos;s feedback settings.
        </p>
      </section>
    </div>
  );
}
