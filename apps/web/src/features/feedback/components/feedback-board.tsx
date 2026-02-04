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
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";

import { useBoardFilters } from "../hooks/use-board-filters";
import {
  BoardViewToggle,
  type BoardView as BoardViewType,
} from "./board-view-toggle";
import { type FeedbackItem, FeedFeedbackView } from "./feed-feedback-view";
import { FeedbackDetailDialog } from "./feedback-detail-dialog";
import { FiltersBar, type SortOption } from "./filters-bar";
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
    <div className="container mx-auto flex min-h-[280px] items-center justify-center px-4 py-8">
      <Spinner aria-label="Loading" className="size-8 text-muted-foreground" />
    </div>
  );
}

function PrivateOrgMessage() {
  return (
    <div className="container mx-auto px-4 py-8">
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
    handleStatusChange: handleStatusFilterChange,
    clearFilters,
    hasActiveFilters,
  } = useBoardFilters(defaultView);

  // Local state (not URL-based)
  const [selectedFeedbackId, setSelectedFeedbackId] =
    useState<Id<"feedback"> | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    title: "",
    description: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optimistic vote tracking
  const [optimisticVotes, setOptimisticVotes] = useState<
    Map<string, { voteType: "upvote" | "downvote" | null; pending: boolean }>
  >(new Map());
  const pendingVotesRef = useRef<Set<string>>(new Set());

  // Track if we've loaded data at least once (to avoid skeleton on filter/search changes)
  const hasLoadedOnce = useRef(false);

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

  // Track when we've loaded data at least once
  if (feedback !== undefined) {
    hasLoadedOnce.current = true;
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
    if (!feedback) {
      return [];
    }

    let result = (feedback as FeedbackItem[]).map((item) =>
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

  // Roadmap columns are organization statuses (not tags)
  // Tags are for categorization (Feature Request, Bug Report, etc.)

  // Handlers
  const handleSubmitFeedback = async () => {
    if (!newFeedback.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isMember) {
        await createFeedbackMember({
          organizationId,
          title: newFeedback.title.trim(),
          description: newFeedback.description.trim() || "",
        });
      } else {
        await createFeedbackPublic({
          organizationId,
          title: newFeedback.title.trim(),
          description: newFeedback.description.trim() || undefined,
          email: newFeedback.email.trim() || undefined,
        });
      }
      setShowSubmitDialog(false);
      setNewFeedback({ title: "", description: "", email: "" });
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
        "py-8 *:mx-auto *:max-w-5xl",
        view === "roadmap" ? "overflow-x-hidden" : "container mx-auto px-4"
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

      {/* Toolbar area */}
      <div className={cn("pb-4", view === "roadmap" && "px-4")}>
        <div className="flex min-w-0 items-center justify-between gap-4 overflow-x-clip">
          {/* Search bar - left */}
          <div className="relative w-48 flex-shrink-0">
            <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-full border-0 bg-muted pr-4 pl-10 focus-visible:ring-2"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              value={searchQuery}
            />
          </div>

          {/* View toggle - center (sticky) */}
          <div className="sticky top-2 z-10">
            <BoardViewToggle
              className="hidden shrink-0 md:flex"
              onChange={setView}
              view={view}
            />
          </div>

          {/* Submit button - right */}
          <div className="flex shrink-0 justify-end">
            <Button
              className="h-10 min-w-10 rounded-full"
              onClick={() => setShowSubmitDialog(true)}
            >
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Submit Feedback</span>
            </Button>
          </div>
        </div>

        {/* Mobile view toggle (sticky) */}
        <div className="sticky top-2 z-10 mt-3 flex justify-center md:hidden">
          <BoardViewToggle onChange={setView} view={view} />
        </div>
      </div>

      {/* Tag filter bar */}
      {(tags && tags.length > 0) || isAdmin ? (
        <div className={cn(view === "roadmap" && "px-4")}>
          <TagFilterBar
            isAdmin={isAdmin}
            onTagSelect={setSelectedTagId}
            organizationId={organizationId}
            selectedTagId={selectedTagId}
            tags={tags ?? []}
          />
        </div>
      ) : null}

      {/* Filters bar (only in feed view) */}
      {view === "feed" && (
        <FiltersBar onSortChange={setSortBy} sortBy={sortBy} />
      )}

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
                key={statusId}
                onClick={() => handleStatusFilterChange(statusId, false)}
                style={{
                  backgroundColor: `${status.color}15`,
                  color: status.color,
                  borderColor: `${status.color}30`,
                }}
                variant="outline"
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
        {view === "roadmap" ? (
          <RoadmapView
            feedback={filteredFeedback}
            isAdmin={isAdmin}
            onFeedbackClick={(id) =>
              setSelectedFeedbackId(id as Id<"feedback">)
            }
            organizationId={organizationId}
            statuses={orgStatuses ?? []}
          />
        ) : (
          <FeedFeedbackView
            feedback={filteredFeedback}
            hasActiveFilters={hasActiveFilters}
            isLoading={feedback === undefined && !hasLoadedOnce.current}
            onFeedbackClick={(id) =>
              setSelectedFeedbackId(id as Id<"feedback">)
            }
            onSubmitClick={() => setShowSubmitDialog(true)}
            onVote={handleToggleVote}
            primaryColor={primaryColor}
            statuses={orgStatuses || []}
          />
        )}
      </div>

      {/* Feedback Detail Dialog */}
      <FeedbackDetailDialog
        feedbackId={selectedFeedbackId}
        isAdmin={isAdmin}
        isMember={isMember}
        onClose={() => setSelectedFeedbackId(null)}
      />

      {/* Submit Dialog */}
      <SubmitFeedbackDialog
        feedback={newFeedback}
        isMember={isMember}
        isOpen={showSubmitDialog}
        isSubmitting={isSubmitting}
        onFeedbackChange={setNewFeedback}
        onOpenChange={setShowSubmitDialog}
        onSubmit={handleSubmitFeedback}
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
