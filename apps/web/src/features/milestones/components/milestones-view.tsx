"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import {
  DEFAULT_MILESTONE_VIEW_STYLE,
  getMilestoneViewComponent,
  type MilestoneViewStyle,
} from "../lib/view-styles";

export interface MilestonesViewProps {
  isAdmin: boolean;
  onFeedbackClick: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
}

interface MilestonesViewDispatcherProps extends MilestonesViewProps {
  milestoneViewStyle?: MilestoneViewStyle;
}

export function MilestonesView({
  milestoneViewStyle,
  ...props
}: MilestonesViewDispatcherProps) {
  const style = milestoneViewStyle ?? DEFAULT_MILESTONE_VIEW_STYLE;
  const ViewComponent = getMilestoneViewComponent(style);
  return <ViewComponent {...props} />;
}
