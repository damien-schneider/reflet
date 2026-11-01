import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { TrackViewPreview } from "@/components/docs/milestone-view-previews";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description: "Prepare display data for the Horizontal track milestone view.",
  path: "/docs/components/milestone-views",
  title: "Milestone views",
});
const SECTIONS = [
  { id: "preview", label: "Horizontal track" },
  { id: "data", label: "Prepare milestone data" },
  { id: "limits", label: "Behavior and limits" },
] as const;
const SHAPE = `interface Milestone {
  id: string;
  name: string;
  emoji: string;
  colorHex: string;
  horizonLabel: string;
  horizonShort: string;
  targetDate: string | null;
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
}`;

export default function MilestoneViewsPage() {
  return (
    <DocsPage
      description="The track renders display data you supply. It does not fetch a roadmap, calculate dates or persist selection."
      sections={SECTIONS}
      title="Milestone views"
    >
      <DocsSection id="preview" sections={SECTIONS}>
        <div className="rounded-lg border border-border bg-background p-4 sm:p-6">
          <TrackViewPreview />
        </div>
        <DocsText>
          <DocsLink href="/docs/components/milestone-views/track">
            Installation and props
          </DocsLink>
        </DocsText>
      </DocsSection>
      <DocsSection id="data" sections={SECTIONS}>
        <CodeBlock code={SHAPE} />
        <DocsText>
          The installed file exports Milestone and MilestoneTrackViewProps. Pass
          milestones and optionally className. Keep ids unique and stable.
          Format dates, horizon labels and percentages before rendering; API
          records need mapping into this shape.
        </DocsText>
        <DocsText>
          Use nonnegative counts, completed + inProgress no greater than total,
          and percentage between 0 and 100. The component does not validate or
          clamp all values. colorHex must be a six-digit hex color because alpha
          suffixes are appended. Check its contrast in both themes.
        </DocsText>
      </DocsSection>
      <DocsSection id="limits" sections={SECTIONS}>
        <DocsList>
          <li>
            The track maintains one active id internally. Click the active
            milestone again to collapse its details. There is no controlled
            selection prop or selection callback.
          </li>
          <li>
            Rows are native buttons with aria-expanded and visible focus states.
            Collapsed details are inert and hidden from assistive technology.
            Preserve those semantics when editing.
          </li>
          <li>
            The track groups exact horizonShort values: "Now", "3mo" and "6mo".
            Milestones with other values are omitted.
          </li>
          <li>
            Empty arrays render the layout without an empty-state message. Add
            loading, empty and error states around the component in your app.
          </li>
          <li>
            The detail panel displays completed and total counts. Its expansion
            transition respects reduced-motion preferences.
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
