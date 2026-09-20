"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { ReactNode } from "react";

import { useFeedbackBoard } from "./feedback-board/feedback-board-context";
import { FeedbackDeleteMenu } from "./feedback-delete-menu";

interface FeedbackCardAdminWrapperProps {
  children: ReactNode;
  feedbackId: Id<"feedback">;
}

export function FeedbackCardAdminWrapper({
  feedbackId,
  children,
}: FeedbackCardAdminWrapperProps) {
  const { isAdmin } = useFeedbackBoard();

  return (
    <FeedbackDeleteMenu canDelete={isAdmin} feedbackId={feedbackId}>
      {children}
    </FeedbackDeleteMenu>
  );
}
