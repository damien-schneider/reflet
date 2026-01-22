"use client";

import {
  Funnel as FilterIcon,
  Gear,
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus,
  SortAscending as SortAscendingIcon,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListCheckboxItem,
  DropdownListContent,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BoardViewToggle,
  type BoardView as BoardViewType,
} from "@/features/feedback/components/board-view-toggle";
import { FeedbackCardWithMorphingDialog } from "@/features/feedback/components/feedback-card-with-morphing-dialog";
import { FeedbackDetailDialog } from "@/features/feedback/components/feedback-detail";
import { RoadmapKanban } from "@/features/feedback/components/roadmap-kanban";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { SubmitFeedbackDialog } from "./submit-feedback-dialog";

type SortOption = "votes" | "newest" | "oldest" | "comments";

interface FeedbackItem {
  _id: string;
  title: string;
  description?: string;
  voteCount: number;
  commentCount: number;
  createdAt: number;
  statusId?: string;
  isPinned?: boolean;
  hasVoted?: boolean;
  userVoteType?: "upvote" | "downvote" | null;
  upvoteCount?: number;
  downvoteCount?: number;
  boardId: string;
  tags?: Array<{ _id: string; name: string; color: string } | null>;
}

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

  // Calculate deltas
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

interface BoardViewProps {
  basePath: string; // e.g., "/dashboard/my-org" or "/my-org"
  primaryColor: string;
  isMember: boolean;
  isAdmin: boolean;
  activeBoardId: Id<"boards"> | null;
  activeBoardFromList?: {
    slug: string;
    name: string;
    defaultView?: string;
  } | null;
}

export function BoardView({
  basePath,
  primaryColor,
  isMember,
  isAdmin,
  activeBoardId,
  activeBoardFromList,
}: BoardViewProps) {
  const [selectedFeedbackId, setSelectedFeedbackId] =
    useState<Id<"feedback"> | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    title: "",
    description: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<BoardViewType>(
    (activeBoardFromList?.defaultView as BoardViewType) ?? "feed"
  );
  const [searchQuery, setMagnifyingGlassQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);

  // Track optimistic vote updates
  const [optimisticVotes, setOptimisticVotes] = useState<
    Map<string, { voteType: "upvote" | "downvote" | null; pending: boolean }>
  >(new Map());
  const pendingVotesRef = useRef<Set<string>>(new Set());

  // Auth guard for protected actions
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Connectez-vous pour voter sur ce feedback",
  });

  // Mutations - use different API based on membership
  const createFeedbackPublic = useMutation(api.feedback_actions.createPublic);
  const createFeedbackMember = useMutation(api.feedback.create);
  const toggleVoteMutation = useMutation(api.votes.toggle);

  // Queries - use unified API that handles member vs non-member filtering
  const feedback = useQuery(
    api.feedback_list.list,
    activeBoardId
      ? {
          boardId: activeBoardId,
          search: searchQuery.trim() || undefined,
          sortBy,
          statusId:
            selectedStatusIds.length > 0
              ? (selectedStatusIds[0] as Id<"boardStatuses">)
              : undefined,
        }
      : "skip"
  );
  const boardStatuses = useQuery(
    api.board_statuses.list,
    activeBoardId ? { boardId: activeBoardId } : "skip"
  );

  // Set default view from board when it loads
  useEffect(() => {
    if (activeBoardFromList?.defaultView) {
      setView(activeBoardFromList.defaultView as BoardViewType);
    }
  }, [activeBoardFromList?.defaultView]);

  // View transition helper
  const handleViewChange = useCallback((newView: BoardViewType) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setView(newView);
      });
    } else {
      setView(newView);
    }
  }, []);

  // Filter, apply optimistic updates, and sort feedback
  const filteredFeedback = useMemo(() => {
    if (!feedback) {
      return [];
    }

    // Apply optimistic vote updates
    let result = feedback.map((item) =>
      applyOptimisticVote(item, optimisticVotes.get(item._id))
    );

    // Status filter (for multiple statuses - API only handles one)
    if (selectedStatusIds.length > 0) {
      result = result.filter(
        (item) => item.statusId && selectedStatusIds.includes(item.statusId)
      );
    }

    // Sort (API handles basic sorting, but we ensure pinned items are first)
    return sortFeedback(result, sortBy);
  }, [feedback, selectedStatusIds, sortBy, optimisticVotes]);

  // Handlers
  const handleSubmitFeedback = async () => {
    if (!(newFeedback.title.trim() && activeBoardId)) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isMember) {
        // Use member API (no email needed, user is authenticated)
        await createFeedbackMember({
          boardId: activeBoardId,
          title: newFeedback.title.trim(),
          description: newFeedback.description.trim() || "",
        });
      } else {
        // Use public API (requires email for notifications)
        await createFeedbackPublic({
          boardId: activeBoardId,
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

      // Guard: show auth dialog if not authenticated
      if (!isAuthenticated) {
        authGuard(() => undefined);
        return;
      }

      // Find current state from server data or optimistic state
      const currentFeedback = feedback?.find((f) => f._id === feedbackId);
      const optimisticState = optimisticVotes.get(feedbackId);
      const currentVoteType =
        optimisticState?.voteType ?? currentFeedback?.userVoteType ?? null;

      // Prevent duplicate requests
      if (pendingVotesRef.current.has(feedbackId)) {
        return;
      }
      pendingVotesRef.current.add(feedbackId);

      // Calculate new vote type (toggle behavior)
      const newVoteType = currentVoteType === voteType ? null : voteType;

      // Apply optimistic update
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
        // Revert optimistic update on error
        setOptimisticVotes((prev) => {
          const next = new Map(prev);
          next.delete(feedbackId);
          return next;
        });
      } finally {
        pendingVotesRef.current.delete(feedbackId);
        // Clear optimistic state after server confirms (data will refresh)
        setOptimisticVotes((prev) => {
          const next = new Map(prev);
          next.delete(feedbackId);
          return next;
        });
      }
    },
    [feedback, optimisticVotes, toggleVoteMutation, isAuthenticated, authGuard]
  );

  const handleFeedbackClick = useCallback((feedbackId: Id<"feedback">) => {
    setSelectedFeedbackId(feedbackId);
  }, []);

  const handleStatusFilterChange = (statusId: string, checked: boolean) => {
    setSelectedStatusIds((prev) =>
      checked ? [...prev, statusId] : prev.filter((id) => id !== statusId)
    );
  };

  const clearFilters = () => {
    setMagnifyingGlassQuery("");
    setSelectedStatusIds([]);
    setSortBy("votes");
  };

  const hasActiveFilters =
    !!searchQuery || selectedStatusIds.length > 0 || sortBy !== "votes";

  if (!activeBoardId) {
    return null;
  }

  return (
    <>
      {/* Search bar - always visible, centered */}
      <div className="mx-auto mb-6 flex max-w-md justify-center">
        <div className="relative w-full">
          <MagnifyingGlassIcon className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 rounded-full border-0 bg-muted pr-4 pl-11 focus-visible:ring-2"
            onChange={(e) => setMagnifyingGlassQuery(e.target.value)}
            placeholder="Search feedback..."
            value={searchQuery}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {activeBoardFromList && (
            <h2 className="font-semibold text-lg">
              {activeBoardFromList.name}
            </h2>
          )}

          {/* View toggle */}
          <BoardViewToggle onChange={handleViewChange} view={view} />
        </div>

        <div className="flex items-center gap-2">
          {/* Settings link (admin only) */}
          {isAdmin && activeBoardFromList?.slug && (
            <Link
              className={buttonVariants({ size: "icon", variant: "outline" })}
              href={`${basePath}/boards/${activeBoardFromList.slug}/settings`}
            >
              <Gear className="h-4 w-4" />
            </Link>
          )}
          {/* Submit feedback button */}
          <Button onClick={() => setShowSubmitDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Submit Feedback
          </Button>
        </div>
      </div>

      {/* Filters bar (only in feed view) */}
      {view === "feed" && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Sort */}
          <Select
            onValueChange={(v) => setSortBy(v as SortOption)}
            value={sortBy}
          >
            <SelectTrigger className="w-40">
              <SortAscendingIcon className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="votes">Most Votes</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="comments">Most Comments</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          {boardStatuses && boardStatuses.length > 0 && (
            <DropdownList>
              <DropdownListTrigger className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 font-medium text-sm hover:bg-accent hover:text-accent-foreground">
                <FilterIcon className="h-4 w-4" />
                Status
                {selectedStatusIds.length > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {selectedStatusIds.length}
                  </Badge>
                )}
              </DropdownListTrigger>
              <DropdownListContent align="end" className="w-48">
                <DropdownListLabel>Filter by status</DropdownListLabel>
                <DropdownListSeparator />
                {boardStatuses.map((status) => (
                  <DropdownListCheckboxItem
                    checked={selectedStatusIds.includes(status._id)}
                    key={status._id}
                    onCheckedChange={(checked: boolean) =>
                      handleStatusFilterChange(status._id, checked)
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </div>
                  </DropdownListCheckboxItem>
                ))}
              </DropdownListContent>
            </DropdownList>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button onClick={clearFilters} size="icon" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="board-view-content mx-auto max-w-3xl">
        {view === "roadmap" ? (
          <RoadmapKanban
            boardId={activeBoardId}
            isMember={isMember}
            onFeedbackClick={handleFeedbackClick}
          />
        ) : (
          <FeedbackFeedView
            activeBoardId={activeBoardId}
            feedback={filteredFeedback}
            hasActiveFilters={hasActiveFilters}
            isAdmin={isAdmin}
            isLoading={feedback === undefined}
            isMember={isMember}
            onSubmitClick={() => setShowSubmitDialog(true)}
            onVote={handleToggleVote}
            primaryColor={primaryColor}
            statuses={boardStatuses || []}
          />
        )}
      </div>

      {/* Feedback Detail Dialog */}
      <FeedbackDetailDialog
        boardId={activeBoardId}
        feedbackId={selectedFeedbackId}
        isAdmin={isAdmin}
        isMember={isMember}
        onClose={() => setSelectedFeedbackId(null)}
      />

      <SubmitFeedbackDialog
        feedback={newFeedback}
        isMember={isMember}
        isOpen={showSubmitDialog}
        isSubmitting={isSubmitting}
        onFeedbackChange={setNewFeedback}
        onOpenChange={setShowSubmitDialog}
        onSubmit={handleSubmitFeedback}
        primaryColor={primaryColor}
      />
    </>
  );
}

// Feed view component
interface FeedbackFeedViewProps {
  feedback: Array<{
    _id: string;
    title: string;
    description?: string;
    voteCount: number;
    commentCount: number;
    createdAt: number;
    statusId?: string;
    isPinned?: boolean;
    hasVoted?: boolean;
    userVoteType?: "upvote" | "downvote" | null;
    upvoteCount?: number;
    downvoteCount?: number;
    boardId: string;
    tags?: Array<{ _id: string; name: string; color: string } | null>;
  }>;
  statuses: Array<{ _id: string; name: string; color: string }>;
  isLoading: boolean;
  hasActiveFilters: boolean;
  primaryColor: string;
  activeBoardId: Id<"boards">;
  isMember: boolean;
  isAdmin: boolean;
  onVote: (
    e: React.MouseEvent,
    feedbackId: string,
    voteType: "upvote" | "downvote"
  ) => void;
  onSubmitClick: () => void;
}

function FeedbackFeedView({
  feedback,
  statuses,
  isLoading,
  hasActiveFilters,
  primaryColor,
  activeBoardId,
  isMember,
  isAdmin,
  onVote,
  onSubmitClick,
}: FeedbackFeedViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div className="h-32 animate-pulse rounded-lg bg-muted" key={i} />
        ))}
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-12">
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
            <Button
              onClick={onSubmitClick}
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Submit Feedback
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback.map((item) => (
        <FeedbackCardWithMorphingDialog
          boardId={activeBoardId}
          feedback={item}
          isAdmin={isAdmin}
          isMember={isMember}
          key={item._id}
          onVote={onVote}
          primaryColor={primaryColor}
          statuses={statuses}
        />
      ))}
    </div>
  );
}
