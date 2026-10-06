import type { BadgeColor, BadgeVariant } from "@ctrl-ui/react/ui/badge";
// Feedback status types and configuration
export type FeedbackStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

// Sort options for feedback list
export type SortOption = "newest" | "oldest" | "most_votes" | "most_comments";

// Status options for selects/dropdowns
export const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { label: "Open", value: "open" },
  { label: "Under review", value: "under_review" },
  { label: "Planned", value: "planned" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
];

export const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; color: BadgeColor; variant?: BadgeVariant }
> = {
  closed: { color: "neutral", label: "Closed" },
  completed: { color: "green", label: "Completed" },
  in_progress: { color: "blue", label: "In progress" },
  open: { color: "blue", label: "Open", variant: "outline" },
  planned: { color: "purple", label: "Planned" },
  under_review: { color: "yellow", label: "Under review" },
};
