"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Suspense } from "react";
import type { BoardView as BoardViewType } from "./board-view-toggle";
import { LoadingState } from "./feedback-board/board-states";
import { FeedbackBoardContent } from "./feedback-board-content";

export interface FeedbackBoardProps {
  defaultView?: BoardViewType;
  isAdmin: boolean;
  isMember: boolean;
  isPublic: boolean;
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
}: FeedbackBoardProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <FeedbackBoardContent
        defaultView={defaultView}
        isAdmin={isAdmin}
        isMember={isMember}
        isPublic={isPublic}
        organizationId={organizationId}
        orgSlug={orgSlug}
        primaryColor={primaryColor}
      />
    </Suspense>
  );
}
