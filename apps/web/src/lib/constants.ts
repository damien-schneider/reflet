import type { BadgeColor, BadgeVariant } from "@ctrl-ui/react/ui/badge";
// Feedback status types and configuration
export type FeedbackStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

export type RoadmapLane = "now" | "next" | "later";

// Extended type that includes backlog (for admin view)
export type RoadmapLaneWithBacklog = RoadmapLane | "backlog";

// Sort options for feedback list
export type SortOption = "newest" | "oldest" | "most_votes" | "most_comments";

// Status options for selects/dropdowns
export const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { label: "Open", value: "open" },
  { label: "Under Review", value: "under_review" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
];

export const LANE_OPTIONS: { value: RoadmapLane; label: string }[] = [
  { label: "Now", value: "now" },
  { label: "Next", value: "next" },
  { label: "Later", value: "later" },
];

export const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; color: BadgeColor; variant?: BadgeVariant }
> = {
  closed: { color: "neutral", label: "Closed" },
  completed: { color: "green", label: "Completed" },
  in_progress: { color: "blue", label: "In Progress" },
  open: { color: "blue", label: "Open", variant: "outline" },
  planned: { color: "purple", label: "Planned" },
  under_review: { color: "yellow", label: "Under Review" },
};

// Lane array for iteration (excluding completed for kanban)
export const ROADMAP_LANES: RoadmapLane[] = ["now", "next", "later"];

// Includes backlog for admin view
export const ROADMAP_LANES_WITH_BACKLOG: RoadmapLaneWithBacklog[] = [
  "backlog",
  "now",
  "next",
  "later",
];

export const LANE_CONFIG: Record<
  RoadmapLaneWithBacklog,
  { label: string; color: string; bgColor: string }
> = {
  backlog: {
    bgColor: "bg-chart-3/10",
    color: "var(--chart-3)",
    label: "Backlog",
  },
  later: {
    bgColor: "bg-muted/50",
    color: "var(--muted-foreground)",
    label: "Later",
  },
  next: {
    bgColor: "bg-chart-4/10",
    color: "var(--chart-4)",
    label: "Next",
  },
  now: {
    bgColor: "bg-chart-2/10",
    color: "var(--chart-2)",
    label: "Now",
  },
};
