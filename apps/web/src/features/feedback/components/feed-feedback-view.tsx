"use client";

import { MagnifyingGlass as MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import type React from "react";

import {
  type CardStyle,
  DEFAULT_CARD_STYLE,
  getCardComponent,
} from "../lib/card-styles";
import { useFeedbackBoard } from "./feedback-board/feedback-board-context";
import { FeedbackCardAdminWrapper } from "./feedback-card-admin-wrapper";
import { FiltersBar, type SortOption } from "./filters-bar";
import type {
  InlineFeedbackInputHandle,
  InlineSubmitData,
} from "./inline-feedback-input";
import { InlineFeedbackInput } from "./inline-feedback-input";

export type { SortOption } from "./filters-bar";

export interface FeedbackItem {
  _id: Id<"feedback">;
  aiComplexity?: string | null;
  aiPriority?: string | null;
  commentCount: number;
  complexity?: string | null;
  createdAt: number;
  description?: string;
  downvoteCount?: number;
  hasVoted?: boolean;
  isPinned?: boolean;
  milestones?: Array<{
    _id: Id<"milestones">;
    name: string;
    emoji?: string;
  }>;
  organizationId: Id<"organizations">;
  organizationStatus?: { name: string; color: string; icon?: string } | null;
  organizationStatusId?: Id<"organizationStatuses">;
  priority?: string | null;
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
  /** Card design style */
  cardStyle?: CardStyle;
  feedback: FeedbackItem[];
  hasActiveFilters: boolean;
  hideCompleted: boolean;
  /** Ref to the inline input for scroll-to-focus from FAB */
  inlineInputRef?: React.Ref<InlineFeedbackInputHandle>;
  isAdmin: boolean;
  isLoading: boolean;
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
  tags: Array<{ _id: string; name: string; color: string }>;
}

export function FeedFeedbackView({
  feedback,
  isLoading,
  hasActiveFilters,
  hideCompleted,
  sortBy,
  onSortChange,
  onHideCompletedToggle,
  statuses,
  selectedStatusIds,
  onStatusChange,
  tags,
  selectedTagIds,
  onTagChange,
  onClearFilters,
  cardStyle,
  isAdmin,
  isMember,
  onInlineSubmit,
  inlineInputRef,
}: FeedFeedbackViewProps) {
  const style = cardStyle ?? DEFAULT_CARD_STYLE;
  const { onFeedbackClick } = useFeedbackBoard();
  const CardComponent = getCardComponent(style);
  if (isLoading) {
    return (
      <div className="space-y-4 px-4">
        {["a", "b", "c"].map((id) => (
          <div className="h-32 animate-pulse rounded-lg bg-muted" key={id} />
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
        <div className="space-y-4 px-4">
          <InlineFeedbackInput
            isAdmin={isAdmin}
            isMember={isMember}
            onSubmit={onInlineSubmit}
            ref={inlineInputRef}
            tags={tags}
          />
          {hasActiveFilters && (
            <div className="flex flex-col items-center justify-center py-8">
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
            </div>
          )}
          {!(hasActiveFilters || hideCompleted) && (
            <p className="py-8 text-center text-muted-foreground">
              Be the first to share your ideas!
            </p>
          )}
          {!hasActiveFilters && hideCompleted && (
            <div className="flex flex-col items-center py-8">
              <p className="mb-2 text-muted-foreground">
                No open feedback yet.
              </p>
              <p className="text-muted-foreground text-sm">
                Completed items are hidden — use the filter to show them.
              </p>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <FiltersBar {...filtersBarProps} />
      <div className="space-y-4 px-4">
        <InlineFeedbackInput
          isMember={isMember}
          onSubmit={onInlineSubmit}
          ref={inlineInputRef}
        />
        <LazyMotion features={domAnimation}>
          <AnimatePresence mode="popLayout">
            {feedback.map((item) => (
              <m.div
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.95 }}
                key={item._id}
                transition={{ duration: 0.2 }}
              >
                <FeedbackCardAdminWrapper feedbackId={item._id}>
                  <CardComponent feedback={item} onClick={onFeedbackClick} />
                </FeedbackCardAdminWrapper>
              </m.div>
            ))}
          </AnimatePresence>
        </LazyMotion>
      </div>
    </>
  );
}
