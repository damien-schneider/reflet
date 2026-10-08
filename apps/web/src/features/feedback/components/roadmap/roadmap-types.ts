import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import type { FeedbackItem } from "../feed-feedback-view";

export type RoadmapStatus = Pick<
  Doc<"organizationStatuses">,
  "_id" | "name" | "color" | "semanticStatus"
>;

export interface RoadmapViewProps {
  feedback: FeedbackItem[];
  isAdmin: boolean;
  onFeedbackClick: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
  statuses: RoadmapStatus[];
}

export interface DraggableFeedbackCardProps {
  isAdmin: boolean;
  item: FeedbackItem;
  onFeedbackClick: (feedbackId: string) => void;
}

export interface DroppableColumnProps {
  isAdmin: boolean;
  isDragging: boolean;
  items: FeedbackItem[];
  onDeleteClick: () => void;
  onFeedbackClick: (feedbackId: string) => void;
  status: RoadmapStatus;
}

export interface OptimisticUpdate {
  feedbackId: Id<"feedback">;
  newStatusId: Id<"organizationStatuses">;
}
