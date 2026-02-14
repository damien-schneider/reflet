"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { createContext, type ReactNode, useContext } from "react";

interface FeedbackBoardContextValue {
  isAdmin: boolean;
  primaryColor?: string;
  statuses: Array<{
    _id: Id<"organizationStatuses">;
    name: string;
    color: string;
  }>;
  onVote: (
    e: React.MouseEvent,
    feedbackId: Id<"feedback">,
    voteType: "upvote" | "downvote"
  ) => void;
  onFeedbackClick: (feedbackId: string) => void;
}

const FeedbackBoardContext = createContext<FeedbackBoardContextValue | null>(
  null
);

export function useFeedbackBoard(): FeedbackBoardContextValue {
  const context = useContext(FeedbackBoardContext);
  if (!context) {
    throw new Error(
      "useFeedbackBoard must be used within a FeedbackBoardProvider"
    );
  }
  return context;
}

interface FeedbackBoardProviderProps extends FeedbackBoardContextValue {
  children: ReactNode;
}

export function FeedbackBoardProvider({
  children,
  ...value
}: FeedbackBoardProviderProps) {
  return <FeedbackBoardContext value={value}>{children}</FeedbackBoardContext>;
}
