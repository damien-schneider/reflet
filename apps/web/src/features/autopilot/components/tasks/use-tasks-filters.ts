"use client";

import type {
  assignedRole,
  priority,
  workItemStatus,
  workItemType,
} from "@reflet/backend/convex/autopilot/schema/validators";
import type { Infer } from "convex/values";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";

export type TaskStatus = Infer<typeof workItemStatus>;
export type TaskType = Infer<typeof workItemType>;
export type TaskPriority = Infer<typeof priority>;
export type TaskRole = Infer<typeof assignedRole>;

export const TASK_STATUSES = [
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
] as const satisfies readonly TaskStatus[];

export const TASK_TYPES = [
  "initiative",
  "story",
  "task",
  "spec",
  "bug",
] as const satisfies readonly TaskType[];

export const TASK_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const satisfies readonly TaskPriority[];

export const TASK_ROLES = [
  "ceo",
  "pm",
  "cto",
  "growth",
  "sales",
  "support",
  "system",
  "validator",
] as const satisfies readonly TaskRole[];

export const TASK_GROUP_BY = [
  "none",
  "status",
  "priority",
  "assignee",
  "parent",
  "label",
  "type",
] as const;

export const TASK_SORT_KEYS = [
  "updated",
  "created",
  "priority",
  "status",
  "due",
] as const;

export const TASK_VIEW_MODES = ["list", "board"] as const;

export type TaskGroupBy = (typeof TASK_GROUP_BY)[number];
export type TaskSortKey = (typeof TASK_SORT_KEYS)[number];
export type TaskViewMode = (typeof TASK_VIEW_MODES)[number];

const DEFAULT_GROUP_BY: TaskGroupBy = "none";
const DEFAULT_SORT_KEY: TaskSortKey = "updated";
const DEFAULT_VIEW_MODE: TaskViewMode = "list";

const filtersParser = {
  status: parseAsArrayOf(parseAsString).withDefault([]),
  type: parseAsArrayOf(parseAsString).withDefault([]),
  priority: parseAsArrayOf(parseAsString).withDefault([]),
  assigneeUserId: parseAsString.withDefault(""),
  assignedRole: parseAsString.withDefault(""),
  labelIds: parseAsArrayOf(parseAsString).withDefault([]),
  q: parseAsString.withDefault(""),
  groupBy: parseAsStringLiteral(TASK_GROUP_BY).withDefault(DEFAULT_GROUP_BY),
  sortKey: parseAsStringLiteral(TASK_SORT_KEYS).withDefault(DEFAULT_SORT_KEY),
  viewMode:
    parseAsStringLiteral(TASK_VIEW_MODES).withDefault(DEFAULT_VIEW_MODE),
};

const DEFAULT_FILTERS: TaskFilters = {
  status: [],
  type: [],
  priority: [],
  assigneeUserId: "",
  assignedRole: "",
  labelIds: [],
  q: "",
  groupBy: DEFAULT_GROUP_BY,
  sortKey: DEFAULT_SORT_KEY,
  viewMode: DEFAULT_VIEW_MODE,
};

export interface TaskFilters {
  assignedRole: string;
  assigneeUserId: string;
  groupBy: TaskGroupBy;
  labelIds: string[];
  priority: string[];
  q: string;
  sortKey: TaskSortKey;
  status: string[];
  type: string[];
  viewMode: TaskViewMode;
}

function isFilterDefault(filters: TaskFilters): boolean {
  return (
    filters.status.length === 0 &&
    filters.type.length === 0 &&
    filters.priority.length === 0 &&
    filters.assigneeUserId === "" &&
    filters.assignedRole === "" &&
    filters.labelIds.length === 0 &&
    filters.q === "" &&
    filters.groupBy === DEFAULT_GROUP_BY &&
    filters.sortKey === DEFAULT_SORT_KEY &&
    filters.viewMode === DEFAULT_VIEW_MODE
  );
}

export interface UseTasksFiltersResult {
  filters: TaskFilters;
  isDefault: boolean;
  reset: () => Promise<URLSearchParams>;
  setFilters: (
    update: Partial<TaskFilters> | ((prev: TaskFilters) => Partial<TaskFilters>)
  ) => Promise<URLSearchParams>;
}

export function useTasksFilters(): UseTasksFiltersResult {
  const [rawFilters, setRawFilters] = useQueryStates(filtersParser, {
    history: "replace",
  });

  const filters: TaskFilters = rawFilters;

  function setFilters(
    update: Partial<TaskFilters> | ((prev: TaskFilters) => Partial<TaskFilters>)
  ) {
    if (typeof update === "function") {
      return setRawFilters((prev) => update(prev));
    }
    return setRawFilters(update);
  }

  function reset() {
    return setRawFilters(DEFAULT_FILTERS);
  }

  const isDefault = isFilterDefault(filters);

  return { filters, setFilters, reset, isDefault };
}
