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
    value: "track" as const,
    label: "Horizontal Track",
    description:
      "Horizontal track grouped by time horizons with pinch-to-zoom.",
  },
  {
    value: "editorial-accordion" as const,
    label: "Editorial Accordion",
    description:
      "Serif typography with percentage column and color-wash accordion.",
  },
  {
    value: "dashboard-timeline" as const,
    label: "Dashboard Timeline",
    description:
      "KPI summary bar at top with vertical timeline and sweep animation.",
  },
] as const;

const MILESTONE_VIEW_COMPONENTS: Record<
  MilestoneViewStyle,
  ComponentType<MilestonesViewProps>
> = {
  track: TrackView,
  "editorial-accordion": EditorialAccordionView,
  "dashboard-timeline": DashboardTimelineView,
};

export function getMilestoneViewComponent(
  style: MilestoneViewStyle
): ComponentType<MilestonesViewProps> {
  return MILESTONE_VIEW_COMPONENTS[style];
}
