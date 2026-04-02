import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { atom } from "jotai";
import type { SortOption } from "../lib/constants";

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
 * Selected board status IDs for filtering (uses boardStatuses table)
 */
export const selectedStatusIdsAtom = atom<Id<"organizationStatuses">[]>([]);

/**
 * Selected tag IDs for filtering
 */
export const selectedTagIdsAtom = atom<Id<"tags">[]>([]);

/**
 * Feedback filter state (combined - legacy)
 */
export interface FeedbackFilters {
  search: string;
  sortBy: "votes" | "newest" | "oldest" | "comments";
  status: string | null;
  tagIds: string[];
}

export const feedbackFiltersAtom = atom<FeedbackFilters>({
  status: null,
  tagIds: [],
  search: "",
  sortBy: "votes",
});

/**
 * Hide completed (highest-order status) feedback items by default
 */
export const hideCompletedAtom = atom<boolean>(true);

/**
 * New feedback dialog state
 */
export const newFeedbackDialogOpenAtom = atom(false);

/**
 * Feedback detail modal state
 */
export const feedbackDetailModalOpenAtom = atom(false);
