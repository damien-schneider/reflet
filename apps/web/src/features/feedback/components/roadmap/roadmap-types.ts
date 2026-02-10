import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { FeedbackItem } from "../feed-feedback-view";

export interface RoadmapViewProps {
  feedback: FeedbackItem[];
  statuses: Array<{ _id: string; name: string; color: string }>;
  onFeedbackClick: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
  isAdmin: boolean;
}

export interface DraggableFeedbackCardProps {
  item: FeedbackItem;
  isAdmin: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  onFeedbackClick: (feedbackId: string) => void;
}

export type DragHandleListeners = Record<
  string,
  (event: React.SyntheticEvent) => void
>;

export interface DroppableColumnProps {
  status: { _id: string; name: string; color: string };
  items: FeedbackItem[];
  isAdmin: boolean;
  isDragging: boolean;
  onFeedbackClick: (feedbackId: string) => void;
  onDeleteClick: () => void;
}

export interface OptimisticUpdate {
  feedbackId: string;
  newStatusId: string;
}
