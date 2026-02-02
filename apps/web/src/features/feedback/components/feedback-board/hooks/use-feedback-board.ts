"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuthGuard } from "@/hooks/use-auth-guard";

import type { BoardViewType, FeedbackItem, SortOption } from "../types";

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

interface UseFeedbackBoardOptions {
  organizationId: Id<"organizations">;
  isMember: boolean;
  defaultView?: BoardViewType;
}

interface UseFeedbackBoardReturn {
  selectedFeedbackId: Id<"feedback"> | null;
  setSelectedFeedbackId: (id: Id<"feedback"> | null) => void;
  showSubmitDialog: boolean;
  setShowSubmitDialog: (show: boolean) => void;
  newFeedback: {
    title: string;
    description: string;
    email: string;
  };
  setNewFeedback: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      email: string;
    }>
  >;
  isSubmitting: boolean;
  view: BoardViewType;
  setView: (view: BoardViewType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  selectedStatusIds: string[];
  setSelectedStatusIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTagIds: string[];
  setSelectedTagIds: React.Dispatch<React.SetStateAction<string[]>>;
  filteredFeedback: FeedbackItem[];
  orgStatuses: Array<{ _id: string; name: string; color: string }> | undefined;
  tags: Array<{ _id: string; name: string; color: string }> | undefined;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  hasActiveFilters: boolean;
  handleSubmitFeedback: () => Promise<void>;
  handleToggleVote: (
    e: React.MouseEvent,
    feedbackId: string,
    voteType: "upvote" | "downvote"
  ) => Promise<void>;
  handleStatusFilterChange: (statusId: string, checked: boolean) => void;
  handleTagFilterChange: (tagId: string, checked: boolean) => void;
  clearFilters: () => void;
}

export function useFeedbackBoard({
  organizationId,
  isMember,
  defaultView = "feed",
}: UseFeedbackBoardOptions): UseFeedbackBoardReturn {
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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [optimisticVotes, setOptimisticVotes] = useState<
    Map<string, { voteType: "upvote" | "downvote" | null; pending: boolean }>
  >(new Map());
  const pendingVotesRef = useRef<Set<string>>(new Set());
  const hasLoadedOnce = useRef(false);

  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

  const feedback = useQuery(api.feedback_list.listByOrganization, {
    organizationId,
    search: searchQuery.trim() || undefined,
    sortBy,
    statusIds:
      selectedStatusIds.length > 0
        ? (selectedStatusIds as Id<"organizationStatuses">[])
        : undefined,
  });

  if (feedback !== undefined) {
    hasLoadedOnce.current = true;
  }

  const orgStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });

  const tags = useQuery(api.tags.list, {
    organizationId,
  });

  const createFeedbackPublic = useMutation(
    api.feedback_actions.createPublicOrg
  );
  const createFeedbackMember = useMutation(api.feedback.create);
  const toggleVoteMutation = useMutation(api.votes.toggle);
  const ensureStatusDefaults = useMutation(
    api.organization_statuses.ensureDefaults
  );

  useEffect(() => {
    if (orgStatuses !== undefined && orgStatuses.length === 0 && isMember) {
      ensureStatusDefaults({ organizationId }).catch(() => undefined);
    }
  }, [orgStatuses, organizationId, isMember, ensureStatusDefaults]);

  const filteredFeedback = useMemo(() => {
    if (!feedback) {
      return [];
    }

    let result = (feedback as FeedbackItem[]).map((item) =>
      applyOptimisticVote(item, optimisticVotes.get(item._id))
    );

    if (selectedTagIds.length > 0) {
      result = result.filter((item) =>
        item.tags?.some((tag) => tag && selectedTagIds.includes(tag._id))
      );
    }

    return sortFeedback(result, sortBy);
  }, [feedback, sortBy, optimisticVotes, selectedTagIds]);

  const handleSubmitFeedback = useCallback(async () => {
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
  }, [
    newFeedback,
    isMember,
    organizationId,
    createFeedbackMember,
    createFeedbackPublic,
  ]);

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

  const handleStatusFilterChange = useCallback(
    (statusId: string, checked: boolean) => {
      setSelectedStatusIds((prev) =>
        checked ? [...prev, statusId] : prev.filter((id) => id !== statusId)
      );
    },
    []
  );

  const handleTagFilterChange = useCallback(
    (tagId: string, checked: boolean) => {
      setSelectedTagIds((prev) =>
        checked ? [...prev, tagId] : prev.filter((id) => id !== tagId)
      );
    },
    []
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedStatusIds([]);
    setSelectedTagIds([]);
    setSortBy("votes");
  }, []);

  const hasActiveFilters =
    !!searchQuery ||
    selectedStatusIds.length > 0 ||
    selectedTagIds.length > 0 ||
    sortBy !== "votes";

  return {
    selectedFeedbackId,
    setSelectedFeedbackId,
    showSubmitDialog,
    setShowSubmitDialog,
    newFeedback,
    setNewFeedback,
    isSubmitting,
    view,
    setView,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedStatusIds,
    setSelectedStatusIds,
    selectedTagIds,
    setSelectedTagIds,
    filteredFeedback,
    orgStatuses,
    tags,
    isLoading: feedback === undefined && !hasLoadedOnce.current,
    hasLoadedOnce: hasLoadedOnce.current,
    hasActiveFilters,
    handleSubmitFeedback,
    handleToggleVote,
    handleStatusFilterChange,
    handleTagFilterChange,
    clearFilters,
  };
}
