/**
 * Shared types for Reflet UI registry components.
 * These mirror the SDK's FeedbackItem interface so registry components
 * work standalone without requiring the SDK as a dependency.
 */

export type FeedbackStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

export interface FeedbackTag {
  color: string;
  id: string;
  name: string;
}

export interface FeedbackAuthor {
  avatar?: string;
  isExternal: boolean;
  name?: string;
}

export interface FeedbackItem {
  author: FeedbackAuthor | null;
  commentCount: number;
  createdAt: number;
  description: string;
  hasVoted: boolean;
  id: string;
  organizationStatus: {
    id: string;
    name: string;
    color: string;
  } | null;
  status: FeedbackStatus;
  tags: FeedbackTag[];
  title: string;
  voteCount: number;
}
