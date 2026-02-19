"use client";

import {
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

import { FeedbackCardWithMorphingDialog } from "./feedback-card-with-morphing-dialog";
import { FiltersBar, type SortOption } from "./filters-bar";

export type { SortOption } from "./filters-bar";

export interface FeedbackItem {
  _id: Id<"feedback">;
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
  organizationId: Id<"organizations">;
  tags?: Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
    appliedByAi?: boolean;
  } | null>;
  organizationStatus?: { name: string; color: string; icon?: string } | null;
  milestones?: Array<{
    _id: Id<"milestones">;
    name: string;
    emoji?: string;
  }>;
  aiPriority?: string | null;
  aiComplexity?: string | null;
  priority?: string | null;
  complexity?: string | null;
}

export interface FeedFeedbackViewProps {
  feedback: FeedbackItem[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  hideCompleted: boolean;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onHideCompletedToggle: () => void;
  onSubmitClick: () => void;
  statuses: Array<{ _id: string; name: string; color?: string }>;
  selectedStatusIds: string[];
  onStatusChange: (id: string, checked: boolean) => void;
  tags: Array<{ _id: string; name: string; color: string }>;
  selectedTagIds: string[];
  onTagChange: (id: string, checked: boolean) => void;
  onClearFilters: () => void;
}

function getEmptyContent({
  hasActiveFilters,
  hideCompleted,
  onSubmitClick,
}: {
  hasActiveFilters: boolean;
  hideCompleted: boolean;
  onSubmitClick: () => void;
}): ReactNode {
  if (hasActiveFilters) {
    return (
      <>
        <MagnifyingGlassIcon className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="font-semibold text-lg">No matching feedback</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or search query.
        </p>
        {hideCompleted && (
          <p className="mt-2 text-muted-foreground text-sm">
            Completed items are hidden — use the filter to show them.
          </p>
        )}
      </>
    );
  }

  if (hideCompleted) {
    return (
      <>
        <p className="mb-2 text-muted-foreground">No open feedback yet.</p>
        <p className="text-muted-foreground text-sm">
          Completed items are hidden — use the filter to show them.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="mb-4 text-muted-foreground">
        Be the first to share your ideas!
      </p>
      <Button onClick={onSubmitClick}>
        <Plus className="mr-2 h-4 w-4" />
        Submit Feedback
      </Button>
    </>
  );
}

export function FeedFeedbackView({
  feedback,
  isLoading,
  hasActiveFilters,
  hideCompleted,
  sortBy,
  onSortChange,
  onHideCompletedToggle,
  onSubmitClick,
  statuses,
  selectedStatusIds,
  onStatusChange,
  tags,
  selectedTagIds,
  onTagChange,
  onClearFilters,
}: FeedFeedbackViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 px-4">
        {[1, 2, 3].map((i) => (
          <div className="h-32 animate-pulse rounded-lg bg-muted" key={i} />
        ))}
      </div>
    );
  }

  const filtersBarProps = {
    hideCompleted,
    onClearFilters,
    onHideCompletedToggle,
    onSortChange,
    onStatusChange,
    onTagChange,
    selectedStatusIds,
    selectedTagIds,
    sortBy,
    statuses,
    tags,
  };

  if (feedback.length === 0) {
    return (
      <>
        <FiltersBar {...filtersBarProps} />
        <div className="flex flex-col items-center justify-center py-12">
          {getEmptyContent({ hasActiveFilters, hideCompleted, onSubmitClick })}
        </div>
      </>
    );
  }

  return (
    <>
      <FiltersBar {...filtersBarProps} />
      <div className="space-y-4 px-4">
        <AnimatePresence mode="popLayout">
          {feedback.map((item) => (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.95 }}
              key={item._id}
              layout
              transition={{ duration: 0.2 }}
            >
              <FeedbackCardWithMorphingDialog feedback={item} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
