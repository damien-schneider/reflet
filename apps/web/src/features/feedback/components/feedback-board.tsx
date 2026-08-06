"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Suspense } from "react";
import type { CardStyle } from "../lib/card-styles";
import type { BoardView as BoardViewType } from "./board-view-toggle";
import { LoadingState } from "./feedback-board/board-states";
import { FeedbackBoardContent } from "./feedback-board-content";

// Props for the FeedbackBoard component
export interface FeedbackBoardProps {
  /** Card design style for the feed view */
  cardStyle?: CardStyle;
  /** Default view mode */
  defaultView?: BoardViewType;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Whether the current user is a member */
  isMember: boolean;
  /** Whether the org is public (for permission checks) */
  isPublic: boolean;
  /** Milestone view style */
  milestoneViewStyle?: "track" | "editorial-accordion" | "dashboard-timeline";
  organizationId: Id<"organizations">;
  orgSlug: string;
  primaryColor?: string;
}

export function FeedbackBoard({
  organizationId,
  orgSlug,
  primaryColor,
  isMember,
  isAdmin,
  isPublic,
  defaultView,
  cardStyle,
  milestoneViewStyle,
}: FeedbackBoardProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <FeedbackBoardContent
        cardStyle={cardStyle}
        defaultView={defaultView}
        isAdmin={isAdmin}
        isMember={isMember}
        isPublic={isPublic}
        milestoneViewStyle={milestoneViewStyle}
        organizationId={organizationId}
        orgSlug={orgSlug}
        primaryColor={primaryColor}
      />
    </Suspense>
  );
}
