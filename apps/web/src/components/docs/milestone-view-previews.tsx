"use client";

import { MilestoneDashboardTimeline } from "@reflet/ui/milestone-dashboard-timeline";
import { MilestoneEditorialAccordion } from "@reflet/ui/milestone-editorial-accordion";
import { MilestoneTrackView } from "@reflet/ui/milestone-track-view";

// Mock milestone data for previews
const MOCK_MILESTONES = [
  {
    colorHex: "#0b6e99",
    emoji: "🚀",
    horizonLabel: "Now",
    horizonShort: "Now",
    id: "m1",
    name: "Public Beta Launch",
    progress: { completed: 5, inProgress: 2, percentage: 63, total: 8 },
    targetDate: "Mar 15",
  },
  {
    colorHex: "#6940a5",
    emoji: "⚡",
    horizonLabel: "Now",
    horizonShort: "Now",
    id: "m2",
    name: "API v2",
    progress: { completed: 1, inProgress: 2, percentage: 20, total: 5 },
    targetDate: "Mar 28",
  },
  {
    colorHex: "#0f7b6c",
    emoji: "📱",
    horizonLabel: "Next Quarter",
    horizonShort: "3mo",
    id: "m3",
    name: "Mobile App",
    progress: { completed: 0, inProgress: 1, percentage: 0, total: 12 },
    targetDate: "Jun 1",
  },
  {
    colorHex: "#d9730d",
    emoji: "🏢",
    horizonLabel: "6 Months",
    horizonShort: "6mo",
    id: "m4",
    name: "Enterprise Features",
    progress: { completed: 0, inProgress: 0, percentage: 0, total: 6 },
    targetDate: null,
  },
];

// ─── Track View Preview ─────────────────────────────────────────────────────

function TrackViewPreview() {
  return <MilestoneTrackView milestones={MOCK_MILESTONES} />;
}

// ─── Editorial Accordion Preview ────────────────────────────────────────────

function EditorialAccordionPreview() {
  return <MilestoneEditorialAccordion milestones={MOCK_MILESTONES} />;
}

// ─── Dashboard Timeline Preview ─────────────────────────────────────────────

function DashboardTimelinePreview() {
  return <MilestoneDashboardTimeline milestones={MOCK_MILESTONES} />;
}

// ─── All Previews (Overview) ────────────────────────────────────────────────

function AllMilestoneViewsPreview() {
  return (
    <div className="grid w-full gap-8 lg:grid-cols-3">
      <div>
        <p className="mb-2 font-medium text-muted-foreground text-xs">
          Horizontal Track
        </p>
        <TrackViewPreview />
      </div>
      <div>
        <p className="mb-2 font-medium text-muted-foreground text-xs">
          Editorial Accordion
        </p>
        <EditorialAccordionPreview />
      </div>
      <div>
        <p className="mb-2 font-medium text-muted-foreground text-xs">
          Dashboard Timeline
        </p>
        <DashboardTimelinePreview />
      </div>
    </div>
  );
}

export {
  AllMilestoneViewsPreview,
  DashboardTimelinePreview,
  EditorialAccordionPreview,
  TrackViewPreview,
};
