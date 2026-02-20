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
  id: string;
  name: string;
  color: string;
}

export interface FeedbackAuthor {
  name?: string;
  avatar?: string;
  isExternal: boolean;
}

export interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  status: FeedbackStatus;
  voteCount: number;
  commentCount: number;
  hasVoted: boolean;
  createdAt: number;
  tags: FeedbackTag[];
  organizationStatus: {
    id: string;
    name: string;
    color: string;
  } | null;
  author: FeedbackAuthor | null;
}
