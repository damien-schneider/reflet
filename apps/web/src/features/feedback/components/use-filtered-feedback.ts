"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMemo } from "react";
import { sortFeedback } from "../lib/sort-feedback";
import {
  applyOptimisticVote,
  type OptimisticVoteState,
} from "./feedback-board/use-optimistic-votes";

type BoardFeedback = Parameters<typeof applyOptimisticVote>[0];

export function useFilteredFeedback({
  feedback,
  previousFeedback,
  optimisticVotes,
  selectedTagId,
  selectedTagIds,
  sortBy,
}: {
  feedback: BoardFeedback[] | undefined;
  previousFeedback: BoardFeedback[] | null;
  optimisticVotes: Map<string, OptimisticVoteState>;
  selectedTagId: Id<"tags"> | null;
  selectedTagIds: Id<"tags">[];
  sortBy: Parameters<typeof sortFeedback>[1];
}) {
  // Apply optimistic updates, client-side tag filtering, and sort feedback
  return useMemo(() => {
    // Use previous feedback during refetch to prevent blinking
    const currentFeedback = feedback ?? previousFeedback ?? [];
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
  }, [
    feedback,
    sortBy,
    optimisticVotes,
    selectedTagId,
    selectedTagIds,
    previousFeedback,
  ]);
}
