"use client";

import {
  CaretUp,
  ChatCircle,
  Funnel as FilterIcon,
  Globe,
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus,
  PushPin,
  SortAscending as SortAscendingIcon,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { H1, Lead } from "@/components/ui/typography";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";

import {
  BoardViewToggle,
  type BoardView as BoardViewType,
} from "./board-view-toggle";
import { FeedbackDetailDialog } from "./feedback-detail-dialog";
import { SubmitFeedbackDialog } from "./submit-feedback-dialog";

type SortOption = "votes" | "newest" | "oldest" | "comments";

interface FeedbackItem {
  _id: string;
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
  organizationId: string;
  tags?: Array<{ _id: string; name: string; color: string } | null>;
  organizationStatus?: { name: string; color: string; icon?: string } | null;
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

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mx-auto mt-2 h-5 w-96" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton className="h-32 w-full" key={i} />
        ))}
      </div>
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

interface FiltersBarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  statuses: Array<{ _id: string; name: string; color: string }>;
  selectedStatusIds: string[];
  onStatusChange: (statusId: string, checked: boolean) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

function FiltersBar({
  sortBy,
  onSortChange,
  statuses,
  selectedStatusIds,
  onStatusChange,
  hasActiveFilters,
  onClearFilters,
}: FiltersBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        onValueChange={(v) => onSortChange(v as SortOption)}
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

      {statuses.length > 0 && (
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
            {statuses.map((status) => (
              <DropdownListCheckboxItem
                checked={selectedStatusIds.includes(status._id)}
                key={status._id}
                onCheckedChange={(checked: boolean) =>
                  onStatusChange(status._id, checked)
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

      {hasActiveFilters && (
        <Button onClick={onClearFilters} size="icon" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      )}
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

export function FeedbackBoard({
  organizationId,
  orgSlug: _orgSlug,
  primaryColor = "#3b82f6",
  isMember,
  isAdmin,
  isPublic,
  defaultView = "feed",
}: FeedbackBoardProps) {
  // State
  const [selectedFeedbackId, setSelectedFeedbackId] =
    useState<Id<"feedback"> | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    title: "",
    description: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<BoardViewType>(defaultView);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);

  // Optimistic vote tracking
  const [optimisticVotes, setOptimisticVotes] = useState<
    Map<string, { voteType: "upvote" | "downvote" | null; pending: boolean }>
  >(new Map());
  const pendingVotesRef = useRef<Set<string>>(new Set());

  // Auth guard
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

  // Queries - organization level
  const feedback = useQuery(api.feedback_list.listByOrganization, {
    organizationId,
    search: searchQuery.trim() || undefined,
    sortBy,
    statusId:
      selectedStatusIds.length > 0
        ? (selectedStatusIds[0] as Id<"organizationStatuses">)
        : undefined,
  });

  const orgStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });

  const tags = useQuery(api.tags.list, { organizationId });

  // Mutations
  const createFeedbackPublic = useMutation(
    api.feedback_actions.createPublicOrg
  );
  const createFeedbackMember = useMutation(api.feedback.create);
  const toggleVoteMutation = useMutation(api.votes.toggle);

  // Filter, apply optimistic updates, and sort feedback
  const filteredFeedback = useMemo(() => {
    if (!feedback) {
      return [];
    }

    let result = (feedback as FeedbackItem[]).map((item) =>
      applyOptimisticVote(item, optimisticVotes.get(item._id))
    );

    // Status filter (for multiple statuses)
    if (selectedStatusIds.length > 0) {
      result = result.filter(
        (item) =>
          item.organizationStatusId &&
          selectedStatusIds.includes(item.organizationStatusId)
      );
    }

    return sortFeedback(result, sortBy);
  }, [feedback, selectedStatusIds, sortBy, optimisticVotes]);

  // Roadmap lanes (tags marked as roadmap lanes)
  const roadmapLanes = useMemo(() => {
    return (tags ?? []).filter((t) => t.isRoadmapLane);
  }, [tags]);

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

  const handleStatusFilterChange = (statusId: string, checked: boolean) => {
    setSelectedStatusIds((prev) =>
      checked ? [...prev, statusId] : prev.filter((id) => id !== statusId)
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatusIds([]);
    setSortBy("votes");
  };

  const hasActiveFilters =
    !!searchQuery || selectedStatusIds.length > 0 || sortBy !== "votes";

  // Loading state
  if (feedback === undefined) {
    return <LoadingSkeleton />;
  }

  // Check if organization is public (for non-members)
  if (!(isPublic || isMember)) {
    return <PrivateOrgMessage />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <H1 variant="page">Feature Requests & Feedback</H1>
        <Lead>
          Help us improve by sharing your ideas and voting on features
          you&apos;d like to see.
        </Lead>
      </div>

      {/* Search bar */}
      <div className="mx-auto mb-6 flex max-w-md justify-center">
        <div className="relative w-full">
          <MagnifyingGlassIcon className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 rounded-full border-0 bg-muted pr-4 pl-11 focus-visible:ring-2"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feedback..."
            value={searchQuery}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <BoardViewToggle onChange={setView} view={view} />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowSubmitDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Submit Feedback
          </Button>
        </div>
      </div>

      {/* Filters bar (only in feed view) */}
      {view === "feed" && (
        <FiltersBar
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onSortChange={setSortBy}
          onStatusChange={handleStatusFilterChange}
          selectedStatusIds={selectedStatusIds}
          sortBy={sortBy}
          statuses={orgStatuses ?? []}
        />
      )}

      {/* Content */}
      <div className="mx-auto max-w-3xl">
        {view === "roadmap" ? (
          <RoadmapView
            feedback={filteredFeedback}
            lanes={roadmapLanes}
            onFeedbackClick={(id) =>
              setSelectedFeedbackId(id as Id<"feedback">)
            }
          />
        ) : (
          <FeedFeedbackView
            feedback={filteredFeedback}
            hasActiveFilters={hasActiveFilters}
            isLoading={feedback === undefined}
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

// Feed view component
interface FeedFeedbackViewProps {
  feedback: FeedbackItem[];
  statuses: Array<{ _id: string; name: string; color: string }>;
  isLoading: boolean;
  hasActiveFilters: boolean;
  primaryColor: string;
  onVote: (
    e: React.MouseEvent,
    feedbackId: string,
    voteType: "upvote" | "downvote"
  ) => void;
  onSubmitClick: () => void;
  onFeedbackClick: (feedbackId: string) => void;
}

function FeedFeedbackView({
  feedback,
  statuses,
  isLoading,
  hasActiveFilters,
  primaryColor,
  onVote,
  onSubmitClick,
  onFeedbackClick,
}: FeedFeedbackViewProps) {
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
    <div className="space-y-4">
      {feedback.map((item) => (
        <FeedbackCard
          feedback={item}
          key={item._id}
          onFeedbackClick={onFeedbackClick}
          onVote={onVote}
          primaryColor={primaryColor}
          statuses={statuses}
        />
      ))}
    </div>
  );
}

// Simple feedback card component
interface FeedbackCardProps {
  feedback: FeedbackItem;
  statuses: Array<{ _id: string; name: string; color: string }>;
  primaryColor: string;
  onVote: (
    e: React.MouseEvent,
    feedbackId: string,
    voteType: "upvote" | "downvote"
  ) => void;
  onFeedbackClick: (feedbackId: string) => void;
}

function FeedbackCard({
  feedback,
  statuses: _statuses,
  primaryColor,
  onVote,
  onFeedbackClick,
}: FeedbackCardProps) {
  const status = feedback.organizationStatus;

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
      onClick={() => onFeedbackClick(feedback._id)}
    >
      <CardContent className="flex gap-4 p-4">
        <button
          className={cn(
            "flex shrink-0 flex-col items-center rounded-lg border p-2 transition-colors",
            feedback.hasVoted
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-primary"
          )}
          onClick={(e) => onVote(e, feedback._id, "upvote")}
          style={
            feedback.hasVoted
              ? {
                  borderColor: primaryColor,
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                }
              : undefined
          }
          type="button"
        >
          <CaretUp className="h-4 w-4" />
          <span className="font-semibold text-sm">{feedback.voteCount}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {feedback.isPinned && (
              <PushPin
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                weight="fill"
              />
            )}
            <h3 className="font-semibold">{feedback.title}</h3>
          </div>

          {feedback.description && (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
              {feedback.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {status && (
              <Badge
                className="font-normal text-xs"
                style={{
                  backgroundColor: `${status.color}15`,
                  color: status.color,
                  borderColor: `${status.color}30`,
                }}
                variant="outline"
              >
                {status.name}
              </Badge>
            )}
            {feedback.tags?.map(
              (tag) =>
                tag && (
                  <Badge
                    className="font-normal text-xs"
                    key={tag._id}
                    style={{
                      backgroundColor: `${tag.color}15`,
                      color: tag.color,
                      borderColor: `${tag.color}30`,
                    }}
                    variant="outline"
                  >
                    {tag.name}
                  </Badge>
                )
            )}
          </div>

          <div className="mt-2 flex items-center gap-4 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <ChatCircle className="h-3.5 w-3.5" />
              {feedback.commentCount}
            </span>
            <span>
              {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Roadmap view component
interface RoadmapViewProps {
  feedback: FeedbackItem[];
  lanes: Array<{ _id: string; name: string; color: string }>;
  onFeedbackClick: (feedbackId: string) => void;
}

function RoadmapView({ feedback, lanes, onFeedbackClick }: RoadmapViewProps) {
  if (lanes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            No roadmap lanes configured. Roadmap lanes are created from tags
            marked as &quot;Is Roadmap Lane&quot;.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {lanes.map((lane) => {
        const laneFeedback = feedback.filter((f) =>
          f.tags?.some((t) => t?._id === lane._id)
        );

        return (
          <div
            className="w-72 shrink-0 rounded-lg border bg-muted/30 p-4"
            key={lane._id}
          >
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: lane.color }}
              />
              <h3 className="font-medium">{lane.name}</h3>
              <Badge className="ml-auto" variant="secondary">
                {laneFeedback.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {laneFeedback.map((item) => (
                <Card
                  className="cursor-pointer p-3 transition-all hover:border-primary/50"
                  key={item._id}
                  onClick={() => onFeedbackClick(item._id)}
                >
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                    <CaretUp className="h-3 w-3" />
                    <span>{item.voteCount}</span>
                    <ChatCircle className="ml-2 h-3 w-3" />
                    <span>{item.commentCount}</span>
                  </div>
                </Card>
              ))}
              {laneFeedback.length === 0 && (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  No items
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
