import type { Id } from "@reflet/backend/convex/_generated/dataModel";

export interface FeedbackListItem {
  _id: Id<"feedback">;
  title: string;
  description?: string;
  voteCount: number;
  commentCount: number;
  createdAt: number;
  organizationStatusId?: Id<"organizationStatuses">;
  hasVoted?: boolean;
  userVoteType?: "upvote" | "downvote" | null;
  organizationId: Id<"organizations">;
  tags?: Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
  } | null>;
}

export interface FeedbackDetailDrawerProps {
  feedbackId: Id<"feedback"> | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  feedbackList?: FeedbackListItem[];
  feedbackIds?: Id<"feedback">[];
  currentIndex?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
}

export type PriorityLevel = "critical" | "high" | "medium" | "low" | "none";
export type ComplexityLevel =
  | "trivial"
  | "simple"
  | "moderate"
  | "complex"
  | "very_complex";

export interface FeedbackDetailContentProps {
  isLoading: boolean | null;
  feedback:
    | {
        _id: Id<"feedback">;
        title: string;
        description: string | null;
        tags?: Array<{
          _id: Id<"tags">;
          name: string;
          color: string;
          appliedByAi?: boolean;
        } | null>;
        hasVoted?: boolean;
        userVoteType?: "upvote" | "downvote" | null;
        voteCount?: number;
        commentCount?: number;
        organizationStatusId?: Id<"organizationStatuses"> | null;
        createdAt: number;
        author?: {
          name?: string | null;
          email?: string;
          image?: string | null;
        } | null;
        assignee?: {
          id: string;
          name?: string | null;
          email?: string;
          image?: string | null;
        } | null;
        organizationId: Id<"organizations">;
        aiPriority?: PriorityLevel;
        aiPriorityReasoning?: string;
        aiComplexity?: ComplexityLevel;
        aiComplexityReasoning?: string;
        aiTimeEstimate?: string;
        priority?: PriorityLevel;
        complexity?: ComplexityLevel;
        timeEstimate?: string;
        deadline?: number;
        attachments?: string[];
      }
    | null
    | undefined;
  feedbackId: Id<"feedback"> | null;
  isAdmin: boolean;
}
