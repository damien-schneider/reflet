import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { AllMilestoneViewsPreview } from "@/components/docs/milestone-view-previews";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description: "Choose a milestone layout and prepare the shared display data.",
  path: "/docs/components/milestone-views",
  title: "Milestone views",
});
const SECTIONS = [
  { id: "views", label: "Choose a view" },
  { id: "data", label: "Prepare milestone data" },
  { id: "limits", label: "Shared behavior and limits" },
] as const;
const VIEWS = [
  {
    description:
      "Groups milestones into Now, Next Quarter and 6 Months columns.",
    href: "/docs/components/milestone-views/track",
    title: "Horizontal track",
  },
  {
    description:
      "Shows progress and date labels, with one expandable detail row.",
    href: "/docs/components/milestone-views/editorial-accordion",
    title: "Editorial accordion",
  },
  {
    description: "Adds aggregate progress above expandable milestone rows.",
    href: "/docs/components/milestone-views/dashboard-timeline",
    title: "Dashboard timeline",
  },
] as const;
const SHAPE = `interface Milestone {
  id: string;
  name: string;
  emoji: string;
  colorHex: string;       // Six-digit hex, for example "#0b6e99"
  horizonLabel: string;   // Display text, for example "This quarter"
  horizonShort: string;   // Track accepts only "Now", "3mo" or "6mo"
  targetDate: string | null; // Already formatted text, not a Date
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    percentage: number;   // 0 to 100; calculated by your app
  };
}`;

export default function MilestoneViewsPage() {
  return (
    <DocsPage
      description="Three registry components consume the same display data. They do not fetch a roadmap, calculate dates or persist selection."
      sections={SECTIONS}
      title="Milestone views"
    >
      <DocsSection id="views" sections={SECTIONS}>
        <div className="rounded-lg border border-border bg-background p-4 sm:p-6">
          <AllMilestoneViewsPreview />
        </div>
        <DocsCardGrid headingLevel="h3" items={VIEWS} />
      </DocsSection>
      <DocsSection id="data" sections={SECTIONS}>
        <CodeBlock code={SHAPE} />
        <DocsText>
          Each installed file exports Milestone and its component's Props type.
          Pass milestones and optionally className. Keep ids unique and stable.
          Format dates, horizon labels and percentages before rendering; API
          records need mapping into this shape.
        </DocsText>
        <DocsText>
          Use nonnegative counts, completed + inProgress no greater than total,
          and percentage between 0 and 100. These components do not validate or
          clamp all values. colorHex must be a six-digit hex color because alpha
          suffixes are appended. Check its contrast in both themes.
        </DocsText>
      </DocsSection>
      <DocsSection id="limits" sections={SECTIONS}>
        <DocsList>
          <li>
            All three maintain one active id internally. Click the active row
            again to collapse it. There is no controlled selection prop or
            selection callback.
          </li>
          <li>
            Rows are native buttons with aria-expanded and visible focus states.
            Collapsed details are inert and hidden from assistive technology.
            Preserve those semantics when editing.
          </li>
          <li>
            Track filters by exact horizonShort values; other values are
            omitted. Accordion and timeline render the array in the order you
            supply.
          </li>
          <li>
            Empty arrays render the layout without an empty-state message. Add
            loading, empty and error states around the component in your app.
          </li>
          <li>
            Progress graphics are decorative; text provides the counts or
            percentages. Reduced-motion preferences are respected by the
            installed animation paths.
          </li>
        </DocsList>
        <DocsText>
          See{" "}
          <DocsLink href="/docs/components/installation">installation</DocsLink>{" "}
          for prerequisites and{" "}
          <DocsLink href="/docs/components/theming">theming</DocsLink> for
          tokens. To manage milestones within Reflet rather than render your own
          view, read <DocsLink href="/docs/using-reflet">using Reflet</DocsLink>
          .
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
