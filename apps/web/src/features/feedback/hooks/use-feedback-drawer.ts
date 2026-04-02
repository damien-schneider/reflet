"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toId } from "@/lib/convex-helpers";

const FEEDBACK_PARAM_KEY = "f";

export interface FeedbackDrawerState {
  isOpen: boolean;
  selectedFeedbackId: Id<"feedback"> | null;
}

export interface FeedbackDrawerActions {
  closeFeedback: () => void;
  navigateToFeedback: (id: Id<"feedback">) => void;
  openFeedback: (id: string) => void;
}

export interface FeedbackDrawerNavigation {
  currentIndex: number;
  feedbackIds: Id<"feedback">[];
  goToNext: () => void;
  goToPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function useFeedbackDrawer(
  feedbackIds: Id<"feedback">[] = []
): FeedbackDrawerState & FeedbackDrawerActions & FeedbackDrawerNavigation {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current state from URL
  const feedbackIdParam = searchParams.get(FEEDBACK_PARAM_KEY);
  const selectedFeedbackId = feedbackIdParam
    ? toId("feedback", feedbackIdParam)
    : null;

  const state: FeedbackDrawerState = {
    selectedFeedbackId,
    isOpen: selectedFeedbackId !== null,
  };

  // Helper to update URL params
  const updateParams = (feedbackId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (feedbackId === null) {
      params.delete(FEEDBACK_PARAM_KEY);
    } else {
      params.set(FEEDBACK_PARAM_KEY, feedbackId);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  // Actions
  const openFeedback = (id: string) => {
    updateParams(id);
  };

  const closeFeedback = () => {
    updateParams(null);
  };

  const navigateToFeedback = (id: Id<"feedback">) => {
    updateParams(id);
  };

  // Navigation
  const currentIndex =
    !state.selectedFeedbackId || feedbackIds.length === 0
      ? -1
      : feedbackIds.indexOf(state.selectedFeedbackId);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < feedbackIds.length - 1;

  const goToPrevious = () => {
    if (hasPrevious && feedbackIds[currentIndex - 1]) {
      navigateToFeedback(feedbackIds[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (hasNext && feedbackIds[currentIndex + 1]) {
      navigateToFeedback(feedbackIds[currentIndex + 1]);
    }
  };

  return {
    ...state,
    openFeedback,
    closeFeedback,
    navigateToFeedback,
    feedbackIds,
    currentIndex,
    hasPrevious,
    hasNext,
    goToPrevious,
    goToNext,
  };
}
