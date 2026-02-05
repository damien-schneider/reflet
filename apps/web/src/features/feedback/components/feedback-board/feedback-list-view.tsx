"use client";

import {
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { FeedbackCardWithMorphingDialog } from "../feedback-card-with-morphing-dialog";

import type { FeedFeedbackViewProps } from "./types";

export function FeedbackListView({
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
      <AnimatePresence mode="popLayout">
        {feedback.map((item) => (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.95 }}
            key={item._id}
            layout
            transition={{ duration: 0.2 }}
          >
            <FeedbackCardWithMorphingDialog
              feedback={item}
              onFeedbackClick={onFeedbackClick}
              onVote={onVote}
              primaryColor={primaryColor}
              statuses={statuses}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
