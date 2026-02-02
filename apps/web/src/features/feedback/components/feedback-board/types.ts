"use client";

import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";

export type SortOption = "votes" | "newest" | "oldest" | "comments";

export type BoardViewType = "feed" | "roadmap";

export interface FeedbackItem {
  _id: string;
  title: string;
  description?: string;
  voteCount: number;
  commentCount: number;
  createdAt: number;
  organizationStatusId?: Id<"organizationStatuses">;
  isPinned?: boolean;
  hasVoted?: boolean;
  userVoteType?: "upvote" | "downvote" | null;
  upvoteCount?: number;
  downvoteCount?: number;
  organizationId: string;
  tags?: Array<{ _id: string; name: string; color: string } | null>;
  organizationStatus?: { name: string; color: string; icon?: string } | null;
}

export interface FiltersBarProps {
  organizationId: Id<"organizations">;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  statuses: Array<{ _id: string; name: string; color: string }>;
  selectedStatusIds: string[];
  onStatusChange: (statusId: string, checked: boolean) => void;
  tags: Array<{ _id: string; name: string; color: string }>;
  selectedTagIds: string[];
  onTagChange: (tagId: string, checked: boolean) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  isAdmin: boolean;
}

export interface FeedbackBoardProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  primaryColor?: string;
  isMember: boolean;
  isAdmin: boolean;
  isPublic: boolean;
  defaultView?: BoardViewType;
}

export interface FeedFeedbackViewProps {
  feedback: FeedbackItem[];
  statuses: Array<{ _id: string; name: string; color: string }>;
  isLoading: boolean;
  hasActiveFilters: boolean;
  /** Org brand color; when undefined, theme primary is used */
  primaryColor?: string;
  onVote: (
    e: React.MouseEvent,
    feedbackId: string,
    voteType: "upvote" | "downvote"
  ) => void;
  onSubmitClick: () => void;
  onFeedbackClick: (feedbackId: string) => void;
}

export interface RoadmapViewProps {
  feedback: FeedbackItem[];
  statuses: Array<{ _id: string; name: string; color: string }>;
  onFeedbackClick: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
  isAdmin: boolean;
}

export interface BoardHeaderProps {
  title?: string;
  subtitle?: string;
}

export interface BoardToolbarProps {
  view: BoardViewType;
  onViewChange: (view: BoardViewType) => void;
  onSubmitClick: () => void;
}

export const DEFAULT_PRIMARY_COLOR = "#3b82f6";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "votes", label: "Most Votes" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "comments", label: "Most Comments" },
];
