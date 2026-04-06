export type ViewMode = "list" | "kanban";
export type SortKey = "status" | "priority" | "updated" | "created";
export type GroupKey = "status" | "priority" | "none";

export const QUICK_FILTERS = [
  { label: "All", statuses: [] as string[] },
  { label: "Active", statuses: ["backlog", "todo", "in_progress"] },
  { label: "Completed", statuses: ["done"] },
  { label: "Paused", statuses: ["in_review", "cancelled"] },
] as const;

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

export const COLUMN_OPTIONS = [
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
  { key: "updated", label: "Updated" },
  { key: "created", label: "Created" },
] as const;

export type ColumnKey = (typeof COLUMN_OPTIONS)[number]["key"];

const STORAGE_KEY_VIEW = "autopilot-initiatives-view";
const STORAGE_KEY_COLS = "autopilot-initiatives-columns";

export function getStoredView(): ViewMode {
  if (typeof window === "undefined") {
    return "list";
  }
  return (localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode) ?? "list";
}

export function getStoredColumns(): Set<ColumnKey> {
  if (typeof window === "undefined") {
    return new Set(["status", "priority", "updated"]);
  }
  const stored = localStorage.getItem(STORAGE_KEY_COLS);
  if (stored) {
    return new Set(JSON.parse(stored) as ColumnKey[]);
  }
  return new Set(["status", "priority", "updated"]);
}

export function persistView(mode: ViewMode): void {
  localStorage.setItem(STORAGE_KEY_VIEW, mode);
}

export function persistColumns(columns: Set<ColumnKey>): void {
  localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify([...columns]));
}
