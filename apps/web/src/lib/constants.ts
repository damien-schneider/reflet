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
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under Review" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

export const LANE_OPTIONS: { value: RoadmapLane; label: string }[] = [
  { value: "now", label: "Now" },
  { value: "next", label: "Next" },
  { value: "later", label: "Later" },
];

export const STATUS_CONFIG: Record<
  FeedbackStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  open: {
    label: "Open",
    variant: "outline",
    className: "border-blue-500 text-blue-600 dark:text-blue-400",
  },
  under_review: {
    label: "Under Review",
    variant: "secondary",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  planned: {
    label: "Planned",
    variant: "secondary",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  in_progress: {
    label: "In Progress",
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  completed: {
    label: "Completed",
    variant: "default",
    className: "bg-green-600 text-white",
  },
  closed: {
    label: "Closed",
    variant: "secondary",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
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
    label: "Backlog",
    color: "#f59e0b",
    bgColor: "bg-amber-50 dark:bg-amber-950",
  },
  now: {
    label: "Now",
    color: "#3b82f6",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  next: {
    label: "Next",
    color: "#8b5cf6",
    bgColor: "bg-purple-50 dark:bg-purple-950",
  },
  later: {
    label: "Later",
    color: "#6b7280",
    bgColor: "bg-gray-50 dark:bg-gray-900",
  },
};

// Color palette for tags and lanes
export const COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
] as const;
