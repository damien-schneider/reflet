"use client";

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
  selectedTagIds,
  sortBy,
}: {
  feedback: BoardFeedback[] | undefined;
  previousFeedback: BoardFeedback[] | null;
  optimisticVotes: Map<string, OptimisticVoteState>;
  selectedTagIds: string[];
  sortBy: Parameters<typeof sortFeedback>[1];
}) {
  const currentFeedback = feedback ?? previousFeedback ?? [];
  if (currentFeedback.length === 0) {
    return [];
  }

  let result = currentFeedback.map((item) =>
    applyOptimisticVote(item, optimisticVotes.get(item._id))
  );

  const tagIdsToFilter = new Set<string>(selectedTagIds);

  if (tagIdsToFilter.size > 0) {
    result = result.filter((item) =>
      item.tags?.some((tag) => tag && tagIdsToFilter.has(tag._id))
    );
  }

  return sortFeedback(result, sortBy);
}
