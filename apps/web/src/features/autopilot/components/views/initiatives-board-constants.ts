export type ViewMode = "list" | "kanban";
export type SortKey = "status" | "priority" | "updated" | "created";
export type GroupKey = "status" | "priority" | "none";

export const QUICK_FILTERS = [
  { label: "All", statuses: [] },
  { label: "Active", statuses: ["backlog", "todo", "in_progress"] },
  { label: "Completed", statuses: ["done"] },
  { label: "Paused", statuses: ["in_review", "cancelled"] },
] satisfies Array<{ label: string; statuses: string[] }>;

export const STATUS_ORDER = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-blue-500",
  in_progress: "bg-amber-500",
  in_review: "bg-purple-500",
  done: "bg-green-500",
  cancelled: "bg-red-500",
};

export const PRIORITY_ORDER = ["critical", "high", "medium", "low"] as const;

const STORAGE_KEY_VIEW = "autopilot-initiatives-view";
const FALLBACK_RANK = 999;
const VIEW_MODES = new Set<string>(["list", "kanban"]);
const GROUP_KEYS = new Set<string>(["status", "priority", "none"]);
const SORT_KEYS = new Set<string>(["status", "priority", "updated", "created"]);
const STATUS_RANKS = STATUS_ORDER.reduce<Record<string, number>>(
  (ranks, status, index) => {
    ranks[status] = index;
    return ranks;
  },
  {}
);
const PRIORITY_RANKS = PRIORITY_ORDER.reduce<Record<string, number>>(
  (ranks, priority, index) => {
    ranks[priority] = index;
    return ranks;
  },
  {}
);

export function isGroupKey(value: string): value is GroupKey {
  return GROUP_KEYS.has(value);
}

export function isSortKey(value: string): value is SortKey {
  return SORT_KEYS.has(value);
}

function isViewMode(value: string | null): value is ViewMode {
  return value !== null && VIEW_MODES.has(value);
}

export function getStatusRank(status: string): number {
  return STATUS_RANKS[status] ?? FALLBACK_RANK;
}

export function getPriorityRank(priority: string): number {
  return PRIORITY_RANKS[priority] ?? FALLBACK_RANK;
}

export function getStoredView(): ViewMode {
  if (typeof window === "undefined") {
    return "list";
  }
  const stored = localStorage.getItem(STORAGE_KEY_VIEW);
  return isViewMode(stored) ? stored : "list";
}

export function persistView(mode: ViewMode): void {
  localStorage.setItem(STORAGE_KEY_VIEW, mode);
}
