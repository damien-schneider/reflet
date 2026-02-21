export const TRACK_VIEW_CODE = `import { MilestoneTrackView } from "@/components/ui/milestone-track-view";

const MILESTONES = [
  {
    id: "m1",
    name: "Public Beta Launch",
    emoji: "🚀",
    colorHex: "#0b6e99",
    horizonLabel: "Now",
    horizonShort: "Now",
    targetDate: "Mar 15",
    progress: { total: 8, completed: 5, inProgress: 2, percentage: 63 },
  },
  // ...
];

export function TrackViewDemo() {
  return <MilestoneTrackView milestones={MILESTONES} />;
}
`;

export const EDITORIAL_ACCORDION_CODE = `import { MilestoneEditorialAccordion } from "@/components/ui/milestone-editorial-accordion";

const MILESTONES = [
  {
    id: "m1",
    name: "Public Beta Launch",
    emoji: "🚀",
    colorHex: "#0b6e99",
    horizonLabel: "Now",
    horizonShort: "Now",
    targetDate: "Mar 15",
    progress: { total: 8, completed: 5, inProgress: 2, percentage: 63 },
  },
  // ...
];

export function EditorialAccordionDemo() {
  return <MilestoneEditorialAccordion milestones={MILESTONES} />;
}
`;

export const DASHBOARD_TIMELINE_CODE = `import { MilestoneDashboardTimeline } from "@/components/ui/milestone-dashboard-timeline";

const MILESTONES = [
  {
    id: "m1",
    name: "Public Beta Launch",
    emoji: "🚀",
    colorHex: "#0b6e99",
    horizonLabel: "Now",
    horizonShort: "Now",
    targetDate: "Mar 15",
    progress: { total: 8, completed: 5, inProgress: 2, percentage: 63 },
  },
  // ...
];

export function DashboardTimelineDemo() {
  return <MilestoneDashboardTimeline milestones={MILESTONES} />;
}
`;
