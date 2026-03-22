import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { FeedbackItem } from "../feed-feedback-view";

export interface RoadmapViewProps {
  feedback: FeedbackItem[];
  isAdmin: boolean;
  onFeedbackClick: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
  statuses: Array<{
    _id: Id<"organizationStatuses">;
    name: string;
    color: string;
  }>;
}

export interface DraggableFeedbackCardProps {
  isAdmin: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  item: FeedbackItem;
  onFeedbackClick: (feedbackId: string) => void;
}

export type DragHandleListeners =
  import("@dnd-kit/core").DraggableSyntheticListeners;

export interface DroppableColumnProps {
  isAdmin: boolean;
  isDragging: boolean;
  items: FeedbackItem[];
  onDeleteClick: () => void;
  onFeedbackClick: (feedbackId: string) => void;
  status: { _id: Id<"organizationStatuses">; name: string; color: string };
}

export interface OptimisticUpdate {
  feedbackId: Id<"feedback">;
  newStatusId: Id<"organizationStatuses">;
}
