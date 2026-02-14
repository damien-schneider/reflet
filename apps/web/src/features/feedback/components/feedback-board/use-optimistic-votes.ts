"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useCallback, useRef, useState } from "react";
import type { FeedbackItem } from "../feed-feedback-view";

type VoteType = "upvote" | "downvote" | null;

interface OptimisticVoteState {
  voteType: VoteType;
  pending: boolean;
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
    userVoteType: newVoteType,
    hasVoted: newVoteType !== null,
    upvoteCount: (item.upvoteCount ?? 0) + upvoteDelta,
    downvoteCount: (item.downvoteCount ?? 0) + downvoteDelta,
    voteCount: item.voteCount + voteCountDelta,
  };
}

interface UseOptimisticVotesOptions {
  feedback: FeedbackItem[] | undefined;
  toggleVoteMutation: (args: {
    feedbackId: Id<"feedback">;
    voteType: "upvote" | "downvote";
  }) => Promise<unknown>;
  isAuthenticated: boolean;
  authGuard: (callback: () => void) => void;
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

  const handleToggleVote = useCallback(
    async (
      e: React.MouseEvent,
      feedbackId: Id<"feedback">,
      voteType: "upvote" | "downvote"
    ) => {
      e.stopPropagation();

      if (!isAuthenticated) {
        authGuard(() => undefined);
        return;
      }

      const currentFeedback = feedback?.find((f) => f._id === feedbackId);
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
          feedbackId,
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

  return { optimisticVotes, handleToggleVote } as const;
}
