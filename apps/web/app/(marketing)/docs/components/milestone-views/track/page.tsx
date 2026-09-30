import type { Metadata } from "next";

import { TRACK_VIEW_CODE } from "@/components/docs/milestone-view-codes";
import { TrackViewPreview } from "@/components/docs/milestone-view-previews";
import { RegistryDocPage } from "@/components/docs/registry-doc-page";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "A horizontal track layout that groups milestones by time horizon.",
  path: "/docs/components/milestone-views/track",
  title: "Horizontal track – milestone view",
});

const IMPORT_CODE = `import { MilestoneTrackView } from "@/components/ui/milestone-track-view";`;

const FEATURES = [
  'Milestones sit in three zones by horizonShort: "Now", "3mo" (Next Quarter) and "6mo" (6 Months).',
  "Farther zones get slightly more width, so the track reads as time stretching out.",
  "Each milestone is tinted with its own colorHex.",
  "Click a milestone to show its completed and total item counts; click again to hide them.",
] as const;

export default function TrackViewPage() {
  return (
    <RegistryDocPage
      description="Milestones laid out on a horizontal track, grouped by time horizon from now to six months out."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<TrackViewPreview />}
      registryName="milestone-track-view"
      title="Horizontal Track"
      usageCode={TRACK_VIEW_CODE}
    />
  );
}
