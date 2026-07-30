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
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  closed: {
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    label: "Closed",
    variant: "secondary",
  },
  completed: {
    className: "bg-green-600 text-white",
    label: "Completed",
    variant: "default",
  },
  in_progress: {
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    label: "In Progress",
    variant: "secondary",
  },
  open: {
    className: "border-blue-500 text-blue-600 dark:text-blue-400",
    label: "Open",
    variant: "outline",
  },
  planned: {
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    label: "Planned",
    variant: "secondary",
  },
  under_review: {
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    label: "Under Review",
    variant: "secondary",
  },
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
    bgColor: "bg-amber-50 dark:bg-amber-950",
    color: "#f59e0b",
    label: "Backlog",
  },
  later: {
    bgColor: "bg-gray-50 dark:bg-gray-900",
    color: "#6b7280",
    label: "Later",
  },
  next: {
    bgColor: "bg-purple-50 dark:bg-purple-950",
    color: "#8b5cf6",
    label: "Next",
  },
  now: {
    bgColor: "bg-blue-50 dark:bg-blue-950",
    color: "#3b82f6",
    label: "Now",
  },
};
