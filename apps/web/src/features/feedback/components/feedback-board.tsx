"use client";

import {
  Globe,
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { H1, Lead } from "@/components/ui/typography";
import { MilestonesView } from "@/features/milestones/components/milestones-view";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";
import { useBoardFilters } from "../hooks/use-board-filters";
import { useFeedbackDrawer } from "../hooks/use-feedback-drawer";
import {
  BoardViewToggle,
  type BoardView as BoardViewType,
} from "./board-view-toggle";
import { type FeedbackItem, FeedFeedbackView } from "./feed-feedback-view";
import { FeedbackDetailDrawer } from "./feedback-detail/feedback-detail-drawer";
import type { SortOption } from "./filters-bar";
import { RoadmapView } from "./roadmap-view";
import { SubmitFeedbackDialog } from "./submit-feedback-dialog";
import { TagFilterBar } from "./tag-filter-bar";

function getVoteValue(
  voteType: "upvote" | "downvote" | null | undefined
): number {
  if (voteType === "upvote") {
    return 1;
  }
  if (voteType === "downvote") {
    return -1;
  }
  return 0;
}

function applyOptimisticVote(
  item: FeedbackItem,
  optimistic:
    | { voteType: "upvote" | "downvote" | null; pending: boolean }
    | undefined
): FeedbackItem {
  if (!optimistic) {
    return item;
  }

  const originalVoteType = item.userVoteType;
  const newVoteType = optimistic.voteType;

  const oldUpvote = originalVoteType === "upvote" ? 1 : 0;
  const oldDownvote = originalVoteType === "downvote" ? 1 : 0;
  const newUpvote = newVoteType === "upvote" ? 1 : 0;
  const newDownvote = newVoteType === "downvote" ? 1 : 0;

  const upvoteDelta = newUpvote - oldUpvote;
  const downvoteDelta = newDownvote - oldDownvote;
  const voteCountDelta =
    getVoteValue(newVoteType) - getVoteValue(originalVoteType);

  return {
    ...item,
    userVoteType: newVoteType,
    hasVoted: newVoteType !== null,
    upvoteCount: (item.upvoteCount ?? 0) + upvoteDelta,
    downvoteCount: (item.downvoteCount ?? 0) + downvoteDelta,
    voteCount: item.voteCount + voteCountDelta,
  };
}

function sortFeedback(
  feedback: FeedbackItem[],
  sortBy: SortOption
): FeedbackItem[] {
  return [...feedback].sort((a, b) => {
    // Pinned items always first
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }

    switch (sortBy) {
      case "votes":
        return b.voteCount - a.voteCount;
      case "newest":
        return b.createdAt - a.createdAt;
      case "oldest":
        return a.createdAt - b.createdAt;
      case "comments":
        return b.commentCount - a.commentCount;
      default:
        return 0;
    }
  });
}

function LoadingState() {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-4 py-8">
      <Spinner aria-label="Loading" className="size-8 text-muted-foreground" />
    </div>
  );
}

function PrivateOrgMessage() {
  return (
    <div className="px-4 py-8">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="font-semibold text-lg">Private organization</h3>
          <p className="text-muted-foreground">
            This organization&apos;s feedback is not publicly accessible.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

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
    clearFilters,
    hasActiveFilters,
  } = useBoardFilters(defaultView);

  // Local state (not URL-based)
  const [newFeedback, setNewFeedback] = useState({
    title: "",
    description: "",
    email: "",
    attachments: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitTagId, setSubmitTagId] = useState<string | undefined>();
  const [submitAssigneeId, setSubmitAssigneeId] = useState<
    string | undefined
  >();

  // Optimistic vote tracking
  const [optimisticVotes, setOptimisticVotes] = useState<
    Map<string, { voteType: "upvote" | "downvote" | null; pending: boolean }>
  >(new Map());
  const pendingVotesRef = useRef<Set<string>>(new Set());

  // Track if we've loaded data at least once (to avoid skeleton on filter/search changes)
  const hasLoadedOnce = useRef(false);
  // Store previous feedback to prevent blinking during refetch
  const previousFeedbackRef = useRef<FeedbackItem[]>([]);

  // Auth guard
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

  // Queries - organization level
  // Note: tagIds filtering is done client-side to avoid loading state when changing tag filters
  const feedback = useQuery(api.feedback_list.listByOrganization, {
    organizationId,
    search: searchQuery.trim() || undefined,
    sortBy,
    statusIds:
      selectedStatusIds.length > 0
        ? (selectedStatusIds as Id<"organizationStatuses">[])
        : undefined,
  });

  // Track when we've loaded data at least once and store previous feedback
  if (feedback !== undefined) {
    hasLoadedOnce.current = true;
    previousFeedbackRef.current = feedback as FeedbackItem[];
  }

  const orgStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });

  const tags = useQuery(api.tags.list, {
    organizationId,
  });

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

    let result = (currentFeedback as FeedbackItem[]).map((item) =>
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
    () => filteredFeedback.map((f) => f._id as Id<"feedback">),
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

  // Handlers
  const handleSubmitFeedback = async () => {
    const trimmedTitle = newFeedback.title.trim();
    if (!trimmedTitle || trimmedTitle.length > 100) {
      return;
    }

    setIsSubmitting(true);
    try {
      const attachments =
        newFeedback.attachments.length > 0
          ? newFeedback.attachments
          : undefined;
      let createdFeedbackId: Id<"feedback"> | undefined;
      if (isMember) {
        createdFeedbackId = await createFeedbackMember({
          organizationId,
          title: trimmedTitle,
          description: newFeedback.description.trim() || "",
          attachments,
          tagId: submitTagId as Id<"tags"> | undefined,
        });
      } else {
        await createFeedbackPublic({
          organizationId,
          title: trimmedTitle,
          description: newFeedback.description.trim() || undefined,
          email: newFeedback.email.trim() || undefined,
          attachments,
        });
      }
      if (createdFeedbackId && submitAssigneeId) {
        await assignFeedback({
          feedbackId: createdFeedbackId,
          assigneeId: submitAssigneeId,
        });
      }
      closeSubmitDrawer();
      setNewFeedback({
        title: "",
        description: "",
        email: "",
        attachments: [],
      });
      setSubmitTagId(undefined);
      setSubmitAssigneeId(undefined);
    } catch {
      // Error is shown by Convex client; keep drawer open so user can fix and retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVote = useCallback(
    async (
      e: React.MouseEvent,
      feedbackId: string,
      voteType: "upvote" | "downvote"
    ) => {
      e.stopPropagation();

      if (!isAuthenticated) {
        authGuard(() => undefined);
        return;
      }

      const currentFeedback = (feedback as FeedbackItem[] | undefined)?.find(
        (f) => f._id === feedbackId
      );
      const optimisticState = optimisticVotes.get(feedbackId);
      const currentVoteType =
        optimisticState?.voteType ?? currentFeedback?.userVoteType ?? null;

      if (pendingVotesRef.current.has(feedbackId)) {
        return;
      }
      pendingVotesRef.current.add(feedbackId);

      const newVoteType = currentVoteType === voteType ? null : voteType;

      setOptimisticVotes((prev) => {
        const next = new Map(prev);
        next.set(feedbackId, { voteType: newVoteType, pending: true });
        return next;
      });

      try {
        await toggleVoteMutation({
          feedbackId: feedbackId as Id<"feedback">,
          voteType,
        });
      } catch {
        setOptimisticVotes((prev) => {
          const next = new Map(prev);
          next.delete(feedbackId);
          return next;
        });
      } finally {
        pendingVotesRef.current.delete(feedbackId);
        setOptimisticVotes((prev) => {
          const next = new Map(prev);
          next.delete(feedbackId);
          return next;
        });
      }
    },
    [feedback, optimisticVotes, toggleVoteMutation, isAuthenticated, authGuard]
  );

  // Only show loading skeleton on initial load, not on filter/search changes
  if (feedback === undefined && !hasLoadedOnce.current) {
    return <LoadingState />;
  }

  // Check if organization is public (for non-members)
  if (!(isPublic || isMember)) {
    return <PrivateOrgMessage />;
  }

  return (
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

      {/* Toolbar area */}
      <div className={cn("mx-auto max-w-6xl px-4 pb-4")}>
        <div className="flex min-w-0 items-center gap-4">
          {/* Search bar */}
          <div className="relative w-48 flex-shrink-0">
            <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-full border-0 bg-muted pr-4 pl-10 focus-visible:ring-2"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              value={searchQuery}
            />
          </div>
        </div>
      </div>

      {/* Submit Feedback - fixed bottom right */}
      <div className="fixed right-4 bottom-4 z-50 md:right-8 md:bottom-8">
        <Button
          className="h-12 rounded-full shadow-lg"
          onClick={openSubmitDrawer}
          size="lg"
        >
          <Plus className="h-4 w-4" />
          Submit Feedback
        </Button>
      </div>

      {/* Tag filter bar */}
      {(tags && tags.length > 0) || isAdmin ? (
        <div>
          <TagFilterBar
            isAdmin={isAdmin}
            onTagSelect={setSelectedTagId}
            organizationId={organizationId}
            selectedTagId={selectedTagId}
            tags={tags ?? []}
          />
        </div>
      ) : null}

      {/* Active status filter chips (only in feed view) */}
      {view === "feed" && selectedStatusIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Status:</span>
          {selectedStatusIds.map((statusId) => {
            const status = (orgStatuses ?? []).find((s) => s._id === statusId);
            if (!status) {
              return null;
            }
            return (
              <Badge
                className="cursor-pointer gap-1 pr-1"
                color={status.color}
                key={statusId}
                onClick={() => handleStatusFilterChange(statusId, false)}
              >
                {status.name}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          <Button
            className="text-xs"
            onClick={clearFilters}
            size="sm"
            variant="ghost"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Content */}
      <div className={view === "feed" ? "mx-auto max-w-3xl" : ""}>
        {view === "milestones" && (
          <MilestonesView
            isAdmin={isAdmin}
            onFeedbackClick={(id) => openFeedback(id as Id<"feedback">)}
            organizationId={organizationId}
          />
        )}
        {view === "roadmap" && (
          <RoadmapView
            feedback={filteredFeedback}
            isAdmin={isAdmin}
            onFeedbackClick={(id) => openFeedback(id as Id<"feedback">)}
            organizationId={organizationId}
            statuses={orgStatuses ?? []}
          />
        )}
        {view === "feed" && (
          <FeedFeedbackView
            feedback={filteredFeedback}
            hasActiveFilters={hasActiveFilters}
            isLoading={feedback === undefined && !hasLoadedOnce.current}
            onFeedbackClick={(id) => openFeedback(id as Id<"feedback">)}
            onSortChange={setSortBy}
            onSubmitClick={openSubmitDrawer}
            onVote={handleToggleVote}
            primaryColor={primaryColor}
            sortBy={sortBy}
            statuses={orgStatuses || []}
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
        isMember={isMember}
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
