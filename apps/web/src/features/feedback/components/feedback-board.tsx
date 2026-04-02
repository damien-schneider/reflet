import { Suspense } from "react";
import { LoadingState } from "./feedback-board/board-states";
import type { FeedbackBoardProps } from "./feedback-board-content";
import { FeedbackBoardContent } from "./feedback-board-content";

export type { FeedbackBoardProps } from "./feedback-board-content";

export function FeedbackBoard(props: FeedbackBoardProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <FeedbackBoardContent {...props} />
    </Suspense>
  );
}
