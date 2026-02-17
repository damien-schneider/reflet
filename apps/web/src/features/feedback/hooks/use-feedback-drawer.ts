"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toId } from "@/lib/convex-helpers";

const FEEDBACK_PARAM_KEY = "f";

export interface FeedbackDrawerState {
  selectedFeedbackId: Id<"feedback"> | null;
  isOpen: boolean;
}

export interface FeedbackDrawerActions {
  openFeedback: (id: string) => void;
  closeFeedback: () => void;
  navigateToFeedback: (id: Id<"feedback">) => void;
}

export interface FeedbackDrawerNavigation {
  feedbackIds: Id<"feedback">[];
  currentIndex: number;
  hasPrevious: boolean;
  hasNext: boolean;
  goToPrevious: () => void;
  goToNext: () => void;
}

export function useFeedbackDrawer(
  feedbackIds: Id<"feedback">[] = []
): FeedbackDrawerState & FeedbackDrawerActions & FeedbackDrawerNavigation {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current state from URL
  const state = useMemo((): FeedbackDrawerState => {
    const feedbackIdParam = searchParams.get(FEEDBACK_PARAM_KEY);
    const selectedFeedbackId = feedbackIdParam
      ? toId("feedback", feedbackIdParam)
      : null;

    return {
      selectedFeedbackId,
      isOpen: selectedFeedbackId !== null,
    };
  }, [searchParams]);

  // Helper to update URL params
  const updateParams = useCallback(
    (feedbackId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (feedbackId === null) {
        params.delete(FEEDBACK_PARAM_KEY);
      } else {
        params.set(FEEDBACK_PARAM_KEY, feedbackId);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Actions
  const openFeedback = useCallback(
    (id: string) => {
      updateParams(id);
    },
    [updateParams]
  );

  const closeFeedback = useCallback(() => {
    updateParams(null);
  }, [updateParams]);

  const navigateToFeedback = useCallback(
    (id: Id<"feedback">) => {
      updateParams(id);
    },
    [updateParams]
  );

  // Navigation
  const currentIndex = useMemo(() => {
    if (!state.selectedFeedbackId || feedbackIds.length === 0) {
      return -1;
    }
    return feedbackIds.indexOf(state.selectedFeedbackId);
  }, [state.selectedFeedbackId, feedbackIds]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < feedbackIds.length - 1;

  const goToPrevious = useCallback(() => {
    if (hasPrevious && feedbackIds[currentIndex - 1]) {
      navigateToFeedback(feedbackIds[currentIndex - 1]);
    }
  }, [hasPrevious, feedbackIds, currentIndex, navigateToFeedback]);

  const goToNext = useCallback(() => {
    if (hasNext && feedbackIds[currentIndex + 1]) {
      navigateToFeedback(feedbackIds[currentIndex + 1]);
    }
  }, [hasNext, feedbackIds, currentIndex, navigateToFeedback]);

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
