/**
 * Shared design tokens for feedback status visuals.
 *
 * Three flavors of color mapping live here so feature components don't drift:
 *  - FEEDBACK_STATUS_BADGE_VARIANTS — Notion-style Badge variant names
 *  - FEEDBACK_STATUS_DOT_COLORS — Tailwind background classes for small dots
 *  - FEEDBACK_STATUS_LABELS — human-readable labels
 */

import type { FeedbackStatus } from "./feedback-types";

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

/**
 * Maps feedback status to a Badge color variant name
 * (consumed by Reflet's `Badge` component variant prop).
 */
export const FEEDBACK_STATUS_BADGE_VARIANTS: Record<FeedbackStatus, string> = {
  open: "blue",
  under_review: "orange",
  planned: "purple",
  in_progress: "yellow",
  completed: "green",
  closed: "gray",
};

/**
 * Maps feedback status to a Tailwind `bg-*` utility class for a small status dot.
 */
export const FEEDBACK_STATUS_DOT_COLORS: Record<FeedbackStatus, string> = {
  open: "bg-blue-500",
  under_review: "bg-orange-500",
  planned: "bg-purple-500",
  in_progress: "bg-yellow-500",
  completed: "bg-green-500",
  closed: "bg-gray-400",
};
