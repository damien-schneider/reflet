import type { Metadata } from "next";
import { TrackViewPreview } from "@/components/docs/milestone-view-previews";
import { RegistryDocPage } from "@/components/docs/registry-doc-page";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Install a horizontal milestone track and map exact time-horizon values.",
  path: "/docs/components/milestone-views/track",
  title: "Horizontal track",
});
const IMPORT_CODE = `import {
  MilestoneTrackView,
  type Milestone,
} from "@/components/ui/milestone-track-view";`;
const USAGE = `const milestones: Milestone[] = [
  {
    id: "keyboard",
    name: "Keyboard navigation",
    emoji: "",
    colorHex: "#0b6e99",
    horizonLabel: "This month",
    horizonShort: "Now",
    targetDate: null,
    progress: { total: 8, completed: 4, inProgress: 2, percentage: 50 },
  },
];

export function Roadmap() {
  return <MilestoneTrackView milestones={milestones} />;
}`;
const FEATURES = [
  'horizonShort groups "Now", "3mo" and "6mo" into Now, Next Quarter and 6 Months. Other values are omitted.',
  "Within each group, input order is preserved. targetDate does not determine position on the track.",
  "The selected milestone shows its name and completed/total counts below the track.",
] as const;

export default function TrackViewPage() {
  return (
    <RegistryDocPage
      description="Milestones grouped into three fixed time horizons, with a selectable completion detail. Supply data and empty/loading states from your app."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<TrackViewPreview />}
      registryName="milestone-track-view"
      subcomponents={[
        {
          description:
            "Client component with internal selection state. Exports MilestoneTrackViewProps and Milestone types.",
          name: "MilestoneTrackView",
          props: [
            {
              description:
                "Unique ids, six-digit colors and exact horizonShort keys. See the milestone views overview for the full data contract.",
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
      title="Horizontal track"
      usageCode={USAGE}
    />
  );
}
