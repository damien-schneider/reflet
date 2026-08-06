"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { H1, Lead } from "@/components/ui/typography";
import { MilestonesView } from "@/features/milestones/components/milestones-view";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { capture } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useBoardFilters } from "../hooks/use-board-filters";
import { useFeedbackDrawer } from "../hooks/use-feedback-drawer";
import { BoardCustomizePopover } from "./board-customize-popover";
import { BoardViewToggle } from "./board-view-toggle";
import { FeedFeedbackView } from "./feed-feedback-view";
import type { FeedbackBoardProps } from "./feedback-board";
import { LoadingState, PrivateOrgMessage } from "./feedback-board/board-states";
import { FeedbackBoardProvider } from "./feedback-board/feedback-board-context";
import { FeedbackToolbar } from "./feedback-board/feedback-toolbar";
import { useOptimisticVotes } from "./feedback-board/use-optimistic-votes";
import { useSubmitFeedback } from "./feedback-board/use-submit-feedback";
import { FeedbackDetailDrawer } from "./feedback-detail/feedback-detail-drawer";
import type {
  InlineFeedbackInputHandle,
  InlineSubmitData,
} from "./inline-feedback-input";
import { RoadmapView } from "./roadmap-view";
import { SubmitFeedbackDialog } from "./submit-feedback-dialog";
import { useFilteredFeedback } from "./use-filtered-feedback";

/**
 * Build query args for the feedback list, delegating "hide completed"
 * filtering to the backend instead of relying on a fragile client-side
 * heuristic based on status order.
 */
function buildFeedbackQueryArgs(
  organizationId: Id<"organizations">,
  searchQuery: string,
  sortBy: "votes" | "newest" | "oldest" | "comments",
  selectedStatusIds: Id<"organizationStatuses">[],
  hideCompleted: boolean
) {
  const hasExplicitStatusFilter = selectedStatusIds.length > 0;
  return {
    hideCompleted: (hideCompleted && !hasExplicitStatusFilter) || undefined,
    organizationId,
    search: searchQuery.trim() || undefined,
    sortBy,
    statusIds: hasExplicitStatusFilter ? selectedStatusIds : undefined,
  };
}

export function FeedbackBoardContent({
  organizationId,
  orgSlug,
  primaryColor,
  isMember,
  isAdmin,
  isPublic,
  defaultView = "feed",
  cardStyle,
  milestoneViewStyle,
}: FeedbackBoardProps) {
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

  // Auth guard
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

  // Queries - organization level
  // Note: tagIds filtering is done client-side to avoid loading state when changing tag filters

  // Fetch statuses first so we can compute effectiveStatusIds for the feedback query
  const orgStatuses = useQuery(api.organizations.statuses.list, {
    organizationId,
  });

  const tags = useQuery(api.feedback.tags.list, {
    organizationId,
  });

  const feedback = useQuery(
    api.feedback.list.listByOrganization,
    buildFeedbackQueryArgs(
      organizationId,
      searchQuery,
      sortBy,
      selectedStatusIds,
      hideCompleted
    )
  );

  // Store previous feedback to prevent blinking during refetch
  // Uses render-time state update pattern (React docs: "Adjusting state based on props")
  const [previousFeedback, setPreviousFeedback] = useState<NonNullable<
    typeof feedback
  > | null>(null);
  if (feedback !== undefined && feedback !== previousFeedback) {
    setPreviousFeedback(feedback);
  }
  const hasLoadedOnce = previousFeedback !== null;

  // Mutations
  const createFeedbackPublic = useMutation(
    api.feedback.actions.createPublicOrg
  );
  const createFeedbackMember = useMutation(api.feedback.mutations.create);
  const assignFeedback = useMutation(api.feedback.triage_actions.assign);
  const toggleVoteMutation = useMutation(api.feedback.votes.toggle);
  const ensureStatusDefaults = useMutation(
    api.organizations.statuses.ensureDefaults
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
    assignFeedback,
    closeSubmitDrawer,
    createFeedbackMember,
    createFeedbackPublic,
    isMember,
    organizationId,
  });

  // Optimistic vote handling
  const { optimisticVotes, handleToggleVote } = useOptimisticVotes({
    authGuard,
    feedback,
    isAuthenticated,
    toggleVoteMutation,
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

  const filteredFeedback = useFilteredFeedback({
    feedback,
    optimisticVotes,
    previousFeedback,
    selectedTagId,
    selectedTagIds,
    sortBy,
  });

  // Extract feedback IDs for drawer navigation
  const feedbackIds = useMemo(
    () => filteredFeedback.map((f) => f._id),
    [filteredFeedback]
  );

  // Inline feedback input ref (for FAB scroll-to-focus)
  const inlineInputRef = useRef<InlineFeedbackInputHandle>(null);

  // Inline submit handler
  const handleInlineSubmit = useCallback(
    async (data: InlineSubmitData) => {
      const attachments =
        data.attachments.length > 0 ? data.attachments : undefined;
      if (isMember) {
        await createFeedbackMember({
          attachments,
          description: data.description || "",
          organizationId,
          tagId: data.tagId,
          title: data.title,
        });
      } else {
        await createFeedbackPublic({
          attachments,
          description: data.description || undefined,
          email: data.email || undefined,
          organizationId,
          title: data.title,
        });
      }
      capture("feedback_created", {
        source: isMember ? "admin" : "public_board",
      });
    },
    [isMember, organizationId, createFeedbackMember, createFeedbackPublic]
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
  if (feedback === undefined && !hasLoadedOnce) {
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
        <div className="sticky top-12 z-10 mb-4 hidden items-center justify-center gap-2 md:flex">
          <BoardViewToggle onChange={setView} view={view} />
          {isAdmin && <BoardCustomizePopover orgSlug={orgSlug} />}
        </div>
        <div
          className="fixed inset-x-0 z-50 flex items-center justify-center gap-2 md:hidden"
          style={{
            bottom:
              "calc(var(--mobile-nav-bottom, 0.75rem) + var(--mobile-nav-height, 3rem) + 0.5rem)",
          }}
        >
          <BoardViewToggle onChange={setView} view={view} />
          {isAdmin && <BoardCustomizePopover orgSlug={orgSlug} />}
        </div>

        <FeedbackToolbar
          inlineInputRef={view === "feed" ? inlineInputRef : undefined}
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
              milestoneViewStyle={milestoneViewStyle}
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
              cardStyle={cardStyle}
              feedback={filteredFeedback}
              hasActiveFilters={hasActiveFilters}
              hideCompleted={hideCompleted}
              inlineInputRef={inlineInputRef}
              isAdmin={isAdmin}
              isLoading={feedback === undefined && !hasLoadedOnce}
              isMember={isMember}
              onClearFilters={clearFilters}
              onHideCompletedToggle={() => setHideCompleted(!hideCompleted)}
              onInlineSubmit={handleInlineSubmit}
              onSortChange={setSortBy}
              onStatusChange={handleStatusFilterChange}
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
