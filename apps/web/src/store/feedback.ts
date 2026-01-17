import { atom } from "jotai";
import type { SortOption } from "@/lib/constants";

// ============================================
// FEEDBACK STORE
// ============================================

/**
 * Currently selected feedback ID for detail view
 */
export const selectedFeedbackIdAtom = atom<string | null>(null);

/**
 * Search query for feedback filtering
 */
export const feedbackSearchAtom = atom<string>("");

/**
 * Sort option for feedback list
 */
export const feedbackSortAtom = atom<SortOption>("most_votes");

/**
 * Selected status filters
 */
export const selectedStatusesAtom = atom<string[]>([]);

/**
 * Selected tag IDs for filtering
 */
export const selectedTagIdsAtom = atom<string[]>([]);

/**
 * Feedback filter state (combined - legacy)
 */
export interface FeedbackFilters {
  status: string | null;
  tagIds: string[];
  search: string;
  sortBy: "votes" | "newest" | "oldest" | "comments";
}

export const feedbackFiltersAtom = atom<FeedbackFilters>({
  status: null,
  tagIds: [],
  search: "",
  sortBy: "votes",
});

/**
 * New feedback dialog state
 */
export const newFeedbackDialogOpenAtom = atom(false);

/**
 * Feedback detail modal state
 */
export const feedbackDetailModalOpenAtom = atom(false);
