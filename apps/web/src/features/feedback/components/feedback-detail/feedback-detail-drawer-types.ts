import type { Id } from "@reflet/backend/convex/_generated/dataModel";

export interface FeedbackListItem {
  _id: Id<"feedback">;
  commentCount: number;
  createdAt: number;
  description?: string;
  hasVoted?: boolean;
  isInternal?: boolean;
  organizationId: Id<"organizations">;
  organizationStatusId?: Id<"organizationStatuses">;
  tags?: Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
  } | null>;
  title: string;
  userVoteType?: "upvote" | "downvote" | null;
  voteCount: number;
}

export interface FeedbackDetailDrawerProps {
  currentIndex?: number;
  feedbackId: Id<"feedback"> | null;
  feedbackIds?: Id<"feedback">[];
  feedbackList?: FeedbackListItem[];
  hasNext?: boolean;
  hasPrevious?: boolean;
  isAdmin?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export interface FeedbackDetailContentProps {
  feedback:
    | import("@/features/feedback/components/properties/property-types").FeedbackDetail
    | null
    | undefined;
  feedbackId: Id<"feedback"> | null;
  isAdmin: boolean;
  isLoading: boolean | null;
}
