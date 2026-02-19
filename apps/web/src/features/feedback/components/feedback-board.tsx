"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { H1, Lead } from "@/components/ui/typography";
import { MilestonesView } from "@/features/milestones/components/milestones-view";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";
import { useBoardFilters } from "../hooks/use-board-filters";
import { useFeedbackDrawer } from "../hooks/use-feedback-drawer";
import { sortFeedback } from "../lib/sort-feedback";
import {
  BoardViewToggle,
  type BoardView as BoardViewType,
} from "./board-view-toggle";
import { FeedFeedbackView } from "./feed-feedback-view";
import { LoadingState, PrivateOrgMessage } from "./feedback-board/board-states";
import { FeedbackBoardProvider } from "./feedback-board/feedback-board-context";
import { FeedbackToolbar } from "./feedback-board/feedback-toolbar";
import {
  applyOptimisticVote,
  useOptimisticVotes,
} from "./feedback-board/use-optimistic-votes";
import { useSubmitFeedback } from "./feedback-board/use-submit-feedback";
import { FeedbackDetailDrawer } from "./feedback-detail/feedback-detail-drawer";
import { RoadmapView } from "./roadmap-view";
import { SubmitFeedbackDialog } from "./submit-feedback-dialog";

// Props for the FeedbackBoard component
export interface FeedbackBoardProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  primaryColor?: string;
  /** Whether the current user is a member */
  isMember: boolean;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Whether the org is public (for permission checks) */
  isPublic: boolean;
  /** Default view mode */
  defaultView?: BoardViewType;
}

function FeedbackBoardContent({
  organizationId,
  primaryColor,
  isMember,
  isAdmin,
  isPublic,
  defaultView = "feed",
}: Omit<FeedbackBoardProps, "orgSlug">) {
  // URL-based filter state
  const {
    view,
    setView,
    sortBy,
    setSortBy,
    selectedStatusIds,
    selectedTagIds,
    selectedTagId,
    setSelectedTagId,
    searchQuery,
    setSearchQuery,
    showSubmitDrawer,
    openSubmitDrawer,
    closeSubmitDrawer,
    handleStatusChange: handleStatusFilterChange,
    handleTagChange,
    clearFilters,
    hasActiveFilters,
    hideCompleted,
    setHideCompleted,
  } = useBoardFilters(defaultView);

  // Track if we've loaded data at least once (to avoid skeleton on filter/search changes)
  const hasLoadedOnce = useRef(false);

  // Auth guard
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

  // Queries - organization level
  // Note: tagIds filtering is done client-side to avoid loading state when changing tag filters

  // Fetch statuses first so we can compute effectiveStatusIds for the feedback query
  const orgStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });

  const tags = useQuery(api.tags.list, {
    organizationId,
  });

  // When hideCompleted=true and no explicit status filter, exclude the highest-order (Done) status.
  // Skip the feedback query until orgStatuses loads to avoid a flash of completed items.
  const skipFeedback =
    hideCompleted &&
    selectedStatusIds.length === 0 &&
    orgStatuses === undefined;

  const effectiveStatusIds = (() => {
    if (selectedStatusIds.length > 0) {
      return selectedStatusIds;
    }
    if (hideCompleted && orgStatuses && orgStatuses.length > 0) {
      const doneStatus = orgStatuses.reduce((max, s) =>
        s.order > max.order ? s : max
      );
      const filteredIds = orgStatuses
        .filter((s) => s._id !== doneStatus._id)
        .map((s) => s._id);
      return filteredIds.length > 0 ? filteredIds : undefined;
    }
    return undefined;
  })();

  const feedback = useQuery(
    api.feedback_list.listByOrganization,
    skipFeedback
      ? "skip"
      : {
          organizationId,
          search: searchQuery.trim() || undefined,
          sortBy,
          statusIds: effectiveStatusIds,
        }
  );

  // Store previous feedback to prevent blinking during refetch
  const previousFeedbackRef = useRef<NonNullable<typeof feedback>>([]);

  // Track when we've loaded data at least once and store previous feedback
  if (feedback !== undefined) {
    hasLoadedOnce.current = true;
    previousFeedbackRef.current = feedback;
  }

  // Mutations
  const createFeedbackPublic = useMutation(
    api.feedback_actions.createPublicOrg
  );
  const createFeedbackMember = useMutation(api.feedback.create);
  const assignFeedback = useMutation(api.feedback_actions.assign);
  const toggleVoteMutation = useMutation(api.votes.toggle);
  const ensureStatusDefaults = useMutation(
    api.organization_statuses.ensureDefaults
  );

  // Submit feedback handler
  const {
    newFeedback,
    setNewFeedback,
    isSubmitting,
    submitTagId,
    setSubmitTagId,
    submitAssigneeId,
    setSubmitAssigneeId,
    handleSubmitFeedback,
  } = useSubmitFeedback({
    organizationId,
    isMember,
    createFeedbackPublic,
    createFeedbackMember,
    assignFeedback,
    closeSubmitDrawer,
  });

  // Optimistic vote handling
  const { optimisticVotes, handleToggleVote } = useOptimisticVotes({
    feedback,
    toggleVoteMutation,
    isAuthenticated,
    authGuard,
  });

  // Ensure default statuses exist for this organization
  useEffect(() => {
    if (orgStatuses !== undefined && orgStatuses.length === 0 && isMember) {
      // No statuses exist, create defaults
      ensureStatusDefaults({ organizationId }).catch(() => {
        // Silently fail - user may not have permission
      });
    }
  }, [orgStatuses, organizationId, isMember, ensureStatusDefaults]);

  // Apply optimistic updates, client-side tag filtering, and sort feedback
  const filteredFeedback = useMemo(() => {
    // Use previous feedback during refetch to prevent blinking
    const currentFeedback = feedback ?? previousFeedbackRef.current;
    if (currentFeedback.length === 0) {
      return [];
    }

    let result = currentFeedback.map((item) =>
      applyOptimisticVote(item, optimisticVotes.get(item._id))
    );

    // Tag filtering: single tag (from bar) takes precedence over multi-tag (from dropdown)
    const tagIdsToFilter = selectedTagId ? [selectedTagId] : selectedTagIds;

    if (tagIdsToFilter.length > 0) {
      result = result.filter((item) =>
        item.tags?.some((tag) => tag && tagIdsToFilter.includes(tag._id))
      );
    }

    return sortFeedback(result, sortBy);
  }, [feedback, sortBy, optimisticVotes, selectedTagId, selectedTagIds]);

  // Extract feedback IDs for drawer navigation
  const feedbackIds = useMemo(
    () => filteredFeedback.map((f) => f._id),
    [filteredFeedback]
  );

  // URL-based drawer state with navigation
  const {
    selectedFeedbackId,
    isOpen: isDrawerOpen,
    openFeedback,
    closeFeedback,
    currentIndex,
    hasPrevious,
    hasNext,
    goToPrevious,
    goToNext,
  } = useFeedbackDrawer(feedbackIds);

  // Only show loading skeleton on initial load, not on filter/search changes
  if (feedback === undefined && !hasLoadedOnce.current) {
    return <LoadingState />;
  }

  // Check if organization is public (for non-members)
  if (!(isPublic || isMember)) {
    return <PrivateOrgMessage />;
  }

  return (
    <FeedbackBoardProvider
      isAdmin={isAdmin}
      onFeedbackClick={openFeedback}
      onVote={handleToggleVote}
      primaryColor={primaryColor}
      statuses={orgStatuses || []}
    >
      <div
        className={cn(
          "py-8"
          // view === "roadmap" ? "overflow-x-hidden" : "container mx-auto px-4"
        )}
      >
        {/* Header */}
        <div className={cn("mb-8 text-center", view === "roadmap" && "px-4")}>
          <H1 variant="page">Feature Requests & Feedback</H1>
          <Lead>
            Help us improve by sharing your ideas and voting on features
            you&apos;d like to see.
          </Lead>
        </div>

        {/* View toggle - sticky on desktop, fixed at bottom on mobile */}
        <div className="sticky top-12 z-10 mb-4 hidden justify-center md:flex">
          <BoardViewToggle onChange={setView} view={view} />
        </div>
        <div
          className="fixed inset-x-0 z-50 flex justify-center md:hidden"
          style={{
            bottom:
              "calc(var(--mobile-nav-bottom, 0.75rem) + var(--mobile-nav-height, 3rem) + 0.5rem)",
          }}
        >
          <BoardViewToggle onChange={setView} view={view} />
        </div>

        <FeedbackToolbar
          isAdmin={isAdmin}
          onSearchChange={setSearchQuery}
          onSubmitClick={openSubmitDrawer}
          onTagSelect={setSelectedTagId}
          organizationId={organizationId}
          searchQuery={searchQuery}
          selectedTagId={selectedTagId}
          tags={tags ?? []}
        />

        {/* Content */}
        <div className={view === "feed" ? "mx-auto max-w-3xl" : ""}>
          {view === "milestones" && (
            <MilestonesView
              isAdmin={isAdmin}
              onFeedbackClick={openFeedback}
              organizationId={organizationId}
            />
          )}
          {view === "roadmap" && (
            <RoadmapView
              feedback={filteredFeedback}
              isAdmin={isAdmin}
              onFeedbackClick={openFeedback}
              organizationId={organizationId}
              statuses={orgStatuses ?? []}
            />
          )}
          {view === "feed" && (
            <FeedFeedbackView
              feedback={filteredFeedback}
              hasActiveFilters={hasActiveFilters}
              hideCompleted={hideCompleted}
              isLoading={feedback === undefined && !hasLoadedOnce.current}
              onClearFilters={clearFilters}
              onHideCompletedToggle={() => setHideCompleted(!hideCompleted)}
              onSortChange={setSortBy}
              onStatusChange={handleStatusFilterChange}
              onSubmitClick={openSubmitDrawer}
              onTagChange={handleTagChange}
              selectedStatusIds={selectedStatusIds}
              selectedTagIds={selectedTagIds}
              sortBy={sortBy}
              statuses={orgStatuses ?? []}
              tags={tags ?? []}
            />
          )}
        </div>

        {/* Feedback Detail Drawer */}
        <FeedbackDetailDrawer
          currentIndex={currentIndex}
          feedbackId={selectedFeedbackId}
          feedbackIds={feedbackIds}
          feedbackList={filteredFeedback}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          isAdmin={isAdmin}
          isOpen={isDrawerOpen}
          onClose={closeFeedback}
          onNext={goToNext}
          onPrevious={goToPrevious}
        />

        {/* Submit Dialog */}
        <SubmitFeedbackDialog
          feedback={newFeedback}
          isAdmin={isAdmin}
          isMember={isMember}
          isOpen={showSubmitDrawer}
          isSubmitting={isSubmitting}
          onAssigneeChange={setSubmitAssigneeId}
          onFeedbackChange={setNewFeedback}
          onOpenChange={(open) => {
            if (open) {
              openSubmitDrawer();
            } else {
              closeSubmitDrawer();
            }
          }}
          onSubmit={handleSubmitFeedback}
          onTagChange={setSubmitTagId}
          organizationId={organizationId}
          selectedAssigneeId={submitAssigneeId}
          selectedTagId={submitTagId}
          tags={tags}
        />
      </div>
    </FeedbackBoardProvider>
  );
}

export function FeedbackBoard({
  organizationId,
  orgSlug: _orgSlug,
  primaryColor,
  isMember,
  isAdmin,
  isPublic,
  defaultView,
}: FeedbackBoardProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <FeedbackBoardContent
        defaultView={defaultView}
        isAdmin={isAdmin}
        isMember={isMember}
        isPublic={isPublic}
        organizationId={organizationId}
        primaryColor={primaryColor}
      />
    </Suspense>
  );
}
