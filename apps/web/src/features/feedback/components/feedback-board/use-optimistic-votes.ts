"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useRef, useState } from "react";
import { capture } from "@/lib/analytics";
import type { FeedbackItem } from "../feed-feedback-view";

type VoteType = "upvote" | "downvote" | null;

export interface OptimisticVoteState {
  pending: boolean;
  voteType: VoteType;
}

export function getVoteValue(
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

export function applyOptimisticVote(
  item: FeedbackItem,
  optimistic: OptimisticVoteState | undefined
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
    downvoteCount: (item.downvoteCount ?? 0) + downvoteDelta,
    hasVoted: newVoteType !== null,
    upvoteCount: (item.upvoteCount ?? 0) + upvoteDelta,
    userVoteType: newVoteType,
    voteCount: item.voteCount + voteCountDelta,
  };
}

interface UseOptimisticVotesOptions {
  authGuard: (callback: () => void) => void;
  feedback: FeedbackItem[] | undefined;
  isAuthenticated: boolean;
  toggleVoteMutation: (args: {
    feedbackId: Id<"feedback">;
    voteType: "upvote" | "downvote";
  }) => Promise<unknown>;
}

export function useOptimisticVotes({
  feedback,
  toggleVoteMutation,
  isAuthenticated,
  authGuard,
}: UseOptimisticVotesOptions) {
  const [optimisticVotes, setOptimisticVotes] = useState<
    Map<string, OptimisticVoteState>
  >(new Map());
  const pendingVotesRef = useRef<Set<string>>(new Set());

  const clearOptimisticVote = (feedbackId: Id<"feedback">) => {
    setOptimisticVotes((prev) => {
      const next = new Map(prev);
      next.delete(feedbackId);
      return next;
    });
  };

  const handleToggleVote = async (
    feedbackId: Id<"feedback">,
    voteType: "upvote" | "downvote"
  ) => {
    if (!isAuthenticated) {
      authGuard(() => undefined);
      return;
    }

    if (pendingVotesRef.current.has(feedbackId)) {
      return;
    }
    pendingVotesRef.current.add(feedbackId);

    const currentFeedback = feedback?.find((f) => f._id === feedbackId);
    const currentVoteType =
      optimisticVotes.get(feedbackId)?.voteType ??
      currentFeedback?.userVoteType ??
      null;
    const newVoteType = currentVoteType === voteType ? null : voteType;

    capture("feedback_voted", {
      action: newVoteType === null ? "remove" : "add",
    });

    setOptimisticVotes((prev) => {
      const next = new Map(prev);
      next.set(feedbackId, { pending: true, voteType: newVoteType });
      return next;
    });

    try {
      await toggleVoteMutation({ feedbackId, voteType });
    } catch {
      toast.error("Your vote didn’t go through. Try again.");
    }
    pendingVotesRef.current.delete(feedbackId);
    clearOptimisticVote(feedbackId);
  };

  return { handleToggleVote, optimisticVotes } as const;
}
