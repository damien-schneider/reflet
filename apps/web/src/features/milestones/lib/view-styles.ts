import type { ComponentType } from "react";
import type { MilestonesViewProps } from "../components/milestones-view";
import { DashboardTimelineView } from "../components/view-designs/dashboard-timeline-view";
import { EditorialAccordionView } from "../components/view-designs/editorial-accordion-view";
import { TrackView } from "../components/view-designs/track-view";

export type MilestoneViewStyle =
  | "track"
  | "editorial-accordion"
  | "dashboard-timeline";

export const DEFAULT_MILESTONE_VIEW_STYLE: MilestoneViewStyle = "track";

export const MILESTONE_VIEW_STYLE_OPTIONS = [
  {
    description:
      "Horizontal track grouped by time horizons with pinch-to-zoom.",
    label: "Horizontal Track",
    value: "track" as const,
  },
  {
    description:
      "Serif typography with percentage column and color-wash accordion.",
    label: "Editorial Accordion",
    value: "editorial-accordion" as const,
  },
  {
    description:
      "KPI summary bar at top with vertical timeline and sweep animation.",
    label: "Dashboard Timeline",
    value: "dashboard-timeline" as const,
  },
] as const;

const MILESTONE_VIEW_COMPONENTS: Record<
  MilestoneViewStyle,
  ComponentType<MilestonesViewProps>
> = {
  "dashboard-timeline": DashboardTimelineView,
  "editorial-accordion": EditorialAccordionView,
  track: TrackView,
};

export function getMilestoneViewComponent(
  style: MilestoneViewStyle
): ComponentType<MilestonesViewProps> {
  return MILESTONE_VIEW_COMPONENTS[style];
}
