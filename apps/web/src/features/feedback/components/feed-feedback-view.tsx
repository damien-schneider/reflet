"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  MotionConfig,
  m,
} from "motion/react";
import type React from "react";

import { SweepCornerFeedCard } from "@/features/feedback/components/card-designs/sweep-corner-card";
import { useFeedbackBoard } from "./feedback-board/feedback-board-context";
import { FeedbackCardAdminWrapper } from "./feedback-card-admin-wrapper";
import type { SortOption } from "./filters-bar";
import type {
  InlineFeedbackInputHandle,
  InlineSubmitData,
} from "./inline-feedback-input";
import { InlineFeedbackInput } from "./inline-feedback-input";

export type { SortOption } from "./filters-bar";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export interface FeedbackItem {
  _id: Id<"feedback">;
  aiComplexity?: Doc<"feedback">["aiComplexity"];
  aiJunk?: number;
  aiNeedsReview?: number;
  aiPriority?: Doc<"feedback">["aiPriority"];
  assignee?: { name?: string | null } | null;
  assigneeId?: string;
  commentCount: number;
  complexity?: Doc<"feedback">["complexity"];
  createdAt: number;
  description?: string;
  downvoteCount?: number;
  hasVoted?: boolean;
  isApproved?: boolean;
  isInternal?: boolean;
  isMember?: boolean;
  isPinned?: boolean;
  milestones?: Array<{
    _id: Id<"milestones">;
    name: string;
    emoji?: string;
  }>;
  needsClarification?: boolean;
  organizationId: Id<"organizations">;
  organizationStatus?: { name: string; color: string; icon?: string } | null;
  organizationStatusId?: Id<"organizationStatuses">;
  priority?: Doc<"feedback">["priority"];
  publicationRejectedAt?: number;
  status?: Doc<"feedback">["status"];
  tags?: Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
    appliedByAi?: boolean;
  } | null>;
  title: string;
  upvoteCount?: number;
  userVoteType?: "upvote" | "downvote" | null;
  voteCount: number;
}

export interface FeedFeedbackViewProps {
  feedback: FeedbackItem[];
  hasActiveFilters: boolean;
  hideCompleted: boolean;
  inlineInputRef?: React.Ref<InlineFeedbackInputHandle>;
  isAdmin: boolean;
  isMember: boolean;
  onClearFilters: () => void;
  onHideCompletedToggle: () => void;
  onInlineSubmit: (data: InlineSubmitData) => Promise<void>;
  onSortChange: (sort: SortOption) => void;
  onStatusChange: (id: string, checked: boolean) => void;
  onTagChange: (id: string, checked: boolean) => void;
  selectedStatusIds: string[];
  selectedTagIds: string[];
  sortBy: SortOption;
  statuses: Array<{ _id: string; name: string; color?: string }>;
  tags: Array<{ _id: Id<"tags">; name: string; color: string; icon?: string }>;
}

function FeedEmptyState({
  hasActiveFilters,
  hideCompleted,
  onClearFilters,
  onHideCompletedToggle,
}: Pick<
  FeedFeedbackViewProps,
  | "hasActiveFilters"
  | "hideCompleted"
  | "onClearFilters"
  | "onHideCompletedToggle"
>) {
  if (hasActiveFilters) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No feedback matches these filters</EmptyTitle>
          <EmptyDescription>
            Try another search, or clear the filters to see everything.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onClearFilters} size="sm" variant="surface">
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (hideCompleted) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No open feedback</EmptyTitle>
          <EmptyDescription>Completed feedback is hidden.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onHideCompletedToggle} size="sm" variant="surface">
            Show completed
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No feedback yet</EmptyTitle>
        <EmptyDescription>Share the first idea above.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function FeedFeedbackView({
  feedback,
  hasActiveFilters,
  hideCompleted,
  onHideCompletedToggle,
  tags,
  onClearFilters,
  isAdmin,
  isMember,
  onInlineSubmit,
  inlineInputRef,
}: FeedFeedbackViewProps) {
  const { onFeedbackClick, onVote } = useFeedbackBoard();

  return (
    <div className="space-y-4">
      <InlineFeedbackInput
        isAdmin={isAdmin}
        isMember={isMember}
        onSubmit={onInlineSubmit}
        ref={inlineInputRef}
        tags={tags}
      />
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">
          <ul aria-label="Feedback" className="space-y-4 empty:hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {feedback.map((item) => (
                <m.li
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  initial={{ opacity: 0, scale: 0.98 }}
                  key={item._id}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                >
                  <FeedbackCardAdminWrapper feedbackId={item._id}>
                    <SweepCornerFeedCard
                      feedback={item}
                      onClick={onFeedbackClick}
                      onVote={onVote}
                    />
                  </FeedbackCardAdminWrapper>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        </MotionConfig>
      </LazyMotion>
      {feedback.length === 0 && (
        <FeedEmptyState
          hasActiveFilters={hasActiveFilters}
          hideCompleted={hideCompleted}
          onClearFilters={onClearFilters}
          onHideCompletedToggle={onHideCompletedToggle}
        />
      )}
    </div>
  );
}
