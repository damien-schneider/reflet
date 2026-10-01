import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import type { FeedbackItem } from "../feed-feedback-view";

export interface RoadmapViewProps {
  feedback: FeedbackItem[];
  isAdmin: boolean;
  onFeedbackClick: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
  statuses: Array<{
    semanticStatus?: Doc<"feedback">["status"];
    _id: Id<"organizationStatuses">;
    name: string;
    color: string;
  }>;
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
  status: Pick<
    Doc<"organizationStatuses">,
    "_id" | "name" | "color" | "semanticStatus"
  >;
}

export interface OptimisticUpdate {
  feedbackId: Id<"feedback">;
  newStatusId: Id<"organizationStatuses">;
}
