"use client";

import { MilestoneDashboardTimeline } from "@reflet/ui/milestone-dashboard-timeline";
import { MilestoneEditorialAccordion } from "@reflet/ui/milestone-editorial-accordion";
import { MilestoneTrackView } from "@reflet/ui/milestone-track-view";

// Mock milestone data for previews
const MOCK_MILESTONES = [
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
  {
    id: "m2",
    name: "API v2",
    emoji: "⚡",
    colorHex: "#6940a5",
    horizonLabel: "Now",
    horizonShort: "Now",
    targetDate: "Mar 28",
    progress: { total: 5, completed: 1, inProgress: 2, percentage: 20 },
  },
  {
    id: "m3",
    name: "Mobile App",
    emoji: "📱",
    colorHex: "#0f7b6c",
    horizonLabel: "Next Quarter",
    horizonShort: "3mo",
    targetDate: "Jun 1",
    progress: { total: 12, completed: 0, inProgress: 1, percentage: 0 },
  },
  {
    id: "m4",
    name: "Enterprise Features",
    emoji: "🏢",
    colorHex: "#d9730d",
    horizonLabel: "6 Months",
    horizonShort: "6mo",
    targetDate: null,
    progress: { total: 6, completed: 0, inProgress: 0, percentage: 0 },
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
  TrackViewPreview,
  EditorialAccordionPreview,
  DashboardTimelinePreview,
  AllMilestoneViewsPreview,
};
