import type { Metadata } from "next";

import { DASHBOARD_TIMELINE_CODE } from "@/components/docs/milestone-view-codes";
import { DashboardTimelinePreview } from "@/components/docs/milestone-view-previews";
import { RegistryDocPage } from "@/components/docs/registry-doc-page";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "A KPI summary bar with vertical timeline and sweep animation on click.",
  path: "/docs/components/milestone-views/dashboard-timeline",
  title: "Dashboard timeline – milestone view",
});

const IMPORT_CODE = `import { MilestoneDashboardTimeline } from "@/components/ui/milestone-dashboard-timeline";`;

const FEATURES = [
  "A summary bar on top: overall progress ring, items done out of total, and in-progress count.",
  "Milestones below on a vertical timeline, each with a split bar for done and in-progress items.",
  "Clicking a milestone plays a short sweep across its row and shows its details.",
] as const;

export default function DashboardTimelinePage() {
  return (
    <RegistryDocPage
      description="A dashboard-style milestone view: a summary bar of overall progress above a vertical timeline."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<DashboardTimelinePreview />}
      registryName="milestone-dashboard-timeline"
      title="Dashboard Timeline"
      usageCode={DASHBOARD_TIMELINE_CODE}
    />
  );
}
