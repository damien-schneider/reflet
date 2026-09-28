"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import { TrackView } from "@/features/milestones/components/view-designs/track-view";

export interface MilestonesViewProps {
  isAdmin: boolean;
  onFeedbackClick: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
}

export function MilestonesView(props: MilestonesViewProps) {
  return <TrackView {...props} />;
}
