import type { Metadata } from "next";
import { DashboardTimelinePreview } from "@/components/docs/milestone-view-previews";
import { RegistryDocPage } from "@/components/docs/registry-doc-page";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Install a milestone timeline with aggregate completion and per-row progress.",
  path: "/docs/components/milestone-views/dashboard-timeline",
  title: "Dashboard timeline",
});
const IMPORT_CODE = `import {
  MilestoneDashboardTimeline,
  type Milestone,
} from "@/components/ui/milestone-dashboard-timeline";`;
const USAGE = `const milestones: Milestone[] = [
  {
    id: "keyboard",
    name: "Keyboard navigation",
    emoji: "",
    colorHex: "#0b6e99",
    horizonLabel: "This quarter",
    horizonShort: "3mo",
    targetDate: null,
    progress: { total: 8, completed: 4, inProgress: 2, percentage: 50 },
  },
];

export function Roadmap() {
  return <MilestoneDashboardTimeline milestones={milestones} />;
}`;
const FEATURES = [
  "The summary sums total, completed and inProgress counts. Overall completion is rounded from summed completed / summed total, not averaged from row percentages.",
  "Rows show name, horizonShort, supplied percentage and done/in-progress segments. Expanded details show the counts.",
  "horizonLabel and targetDate are required by the shared type but unused by this view.",
] as const;

export default function DashboardTimelinePage() {
  return (
    <RegistryDocPage
      description="Aggregate completion above a milestone timeline. Each row expands to show its counts; the component does not fetch or persist data."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<DashboardTimelinePreview />}
      registryName="milestone-dashboard-timeline"
      subcomponents={[
        {
          description:
            "Client component with internal row selection. Exports MilestoneDashboardTimelineProps and Milestone types.",
          name: "MilestoneDashboardTimeline",
          props: [
            {
              description:
                "Display-ready data with unique ids. See the milestone views overview for the full contract.",
              name: "milestones",
              required: true,
              type: "Milestone[]",
            },
            {
              description: "Classes merged onto the outer wrapper.",
              name: "className",
              type: "string",
            },
          ],
        },
      ]}
      title="Dashboard timeline"
      usageCode={USAGE}
    />
  );
}
