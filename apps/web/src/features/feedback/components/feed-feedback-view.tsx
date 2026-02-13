"use client";

import {
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";

import { FeedbackCardWithMorphingDialog } from "./feedback-card-with-morphing-dialog";
import { FiltersBar, type SortOption } from "./filters-bar";

export type { SortOption } from "./filters-bar";

export interface FeedbackItem {
  _id: string;
  title: string;
  description?: string;
  voteCount: number;
  commentCount: number;
  createdAt: number;
  organizationStatusId?: string;
  isPinned?: boolean;
  hasVoted?: boolean;
  userVoteType?: "upvote" | "downvote" | null;
  upvoteCount?: number;
  downvoteCount?: number;
  organizationId: string;
  tags?: Array<{
    _id: string;
    name: string;
    color: string;
    icon?: string;
    appliedByAi?: boolean;
  } | null>;
  organizationStatus?: { name: string; color: string; icon?: string } | null;
  milestones?: Array<{
    _id: string;
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
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onSubmitClick: () => void;
}

export function FeedFeedbackView({
  feedback,
  isLoading,
  hasActiveFilters,
  sortBy,
  onSortChange,
  onSubmitClick,
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

  if (feedback.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        {hasActiveFilters ? (
          <>
            <MagnifyingGlassIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold text-lg">No matching feedback</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search query.
            </p>
          </>
        ) : (
          <>
            <p className="mb-4 text-muted-foreground">
              Be the first to share your ideas!
            </p>
            <Button onClick={onSubmitClick}>
              <Plus className="mr-2 h-4 w-4" />
              Submit Feedback
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <FiltersBar onSortChange={onSortChange} sortBy={sortBy} />
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
