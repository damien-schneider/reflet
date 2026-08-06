"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { H1 } from "@/components/ui/typography";
import { MilestonesView } from "@/features/milestones/components/milestones-view";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { capture } from "@/lib/analytics";
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

  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

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

  const [previousFeedback, setPreviousFeedback] = useState<NonNullable<
    typeof feedback
  > | null>(null);
  if (feedback !== undefined && feedback !== previousFeedback) {
    setPreviousFeedback(feedback);
  }
  const hasLoadedOnce = previousFeedback !== null;

  const createFeedbackPublic = useMutation(
    api.feedback.actions.createPublicOrg
  );
  const createFeedbackMember = useMutation(api.feedback.mutations.create);
  const assignFeedback = useMutation(api.feedback.triage_actions.assign);
  const toggleVoteMutation = useMutation(api.feedback.votes.toggle);
  const ensureStatusDefaults = useMutation(
    api.organizations.statuses.ensureDefaults
  );

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

  const { optimisticVotes, handleToggleVote } = useOptimisticVotes({
    authGuard,
    feedback,
    isAuthenticated,
    toggleVoteMutation,
  });

  useEffect(() => {
    if (orgStatuses !== undefined && orgStatuses.length === 0 && isMember) {
      ensureStatusDefaults({ organizationId }).catch(() => undefined);
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

  const feedbackIds = useMemo(
    () => filteredFeedback.map((f) => f._id),
    [filteredFeedback]
  );

  const inlineInputRef = useRef<InlineFeedbackInputHandle>(null);

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

  if (feedback === undefined && !hasLoadedOnce) {
    return <LoadingState />;
  }

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
      <div className="py-6">
        <div className="mx-auto mb-5 flex max-w-3xl items-center justify-between px-4">
          <H1 variant="page">Feedback</H1>
          <div className="hidden items-center gap-2 md:flex">
            <BoardViewToggle onChange={setView} view={view} />
            {isAdmin && <BoardCustomizePopover orgSlug={orgSlug} />}
          </div>
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
          showSearch={filteredFeedback.length > 0 || searchQuery.length > 0}
          tags={tags ?? []}
        />

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
