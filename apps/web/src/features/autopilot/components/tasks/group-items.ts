import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";

import type { TaskGroupBy } from "./use-tasks-filters";

type WorkItem = Doc<"autopilotWorkItems">;

const STATUS_GROUP_ORDER = [
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
] as const;

const PRIORITY_GROUP_ORDER = ["critical", "high", "medium", "low"] as const;

const TYPE_GROUP_ORDER = [
  "initiative",
  "story",
  "task",
  "spec",
  "bug",
] as const;

const UNASSIGNED_KEY = "__unassigned__";
const NO_PARENT_KEY = "__no_parent__";
const NO_LABEL_KEY = "__no_label__";

export function getGroupOrder(groupBy: TaskGroupBy): readonly string[] {
  if (groupBy === "status") {
    return STATUS_GROUP_ORDER;
  }
  if (groupBy === "priority") {
    return PRIORITY_GROUP_ORDER;
  }
  if (groupBy === "type") {
    return TYPE_GROUP_ORDER;
  }
  return [];
}

export function getGroupLabel(groupBy: TaskGroupBy, key: string): string {
  if (key === UNASSIGNED_KEY) {
    return "Unassigned";
  }
  if (key === NO_PARENT_KEY) {
    return "No parent";
  }
  if (key === NO_LABEL_KEY) {
    return "No label";
  }
  if (groupBy === "status") {
    const labels: Record<string, string> = {
      triage: "Triage",
      backlog: "Backlog",
      todo: "To Do",
      in_progress: "In Progress",
      in_review: "In Review",
      done: "Done",
      cancelled: "Cancelled",
    };
    return labels[key] ?? key;
  }
  if (groupBy === "priority") {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  if (groupBy === "type") {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return key;
}

function pickGroupKey(
  groupBy: TaskGroupBy,
  item: WorkItem,
  itemLabels?: Map<Id<"autopilotWorkItems">, Id<"workItemLabels">[]>
): string[] {
  if (groupBy === "status") {
    return [item.status];
  }
  if (groupBy === "priority") {
    return [item.priority];
  }
  if (groupBy === "type") {
    return [item.type];
  }
  if (groupBy === "assignee") {
    return [item.assigneeUserId ?? UNASSIGNED_KEY];
  }
  if (groupBy === "parent") {
    return [(item.parentId as string | undefined) ?? NO_PARENT_KEY];
  }
  if (groupBy === "label") {
    const ids = itemLabels?.get(item._id) ?? [];
    if (ids.length === 0) {
      return [NO_LABEL_KEY];
    }
    return ids as unknown as string[];
  }
  return [];
}

export interface GroupedItems {
  items: WorkItem[];
  key: string;
  label: string;
}

export function groupItems(
  items: WorkItem[],
  groupBy: TaskGroupBy,
  itemLabels?: Map<Id<"autopilotWorkItems">, Id<"workItemLabels">[]>,
  labelLookup?: Map<string, string>
): GroupedItems[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "All", items }];
  }

  const buckets = new Map<string, WorkItem[]>();
  for (const item of items) {
    const keys = pickGroupKey(groupBy, item, itemLabels);
    for (const key of keys) {
      const existing = buckets.get(key);
      if (existing) {
        existing.push(item);
      } else {
        buckets.set(key, [item]);
      }
    }
  }

  const order = getGroupOrder(groupBy);
  const ordered: GroupedItems[] = [];

  for (const key of order) {
    const bucket = buckets.get(key);
    if (bucket && bucket.length > 0) {
      ordered.push({
        key,
        label: getGroupLabel(groupBy, key),
        items: bucket,
      });
      buckets.delete(key);
    }
  }

  // Append remaining (unknown) keys alphabetically by label.
  const remaining = Array.from(buckets.entries()).map(([key, bucketItems]) => {
    let label: string;
    if (groupBy === "label" && labelLookup) {
      label = labelLookup.get(key) ?? getGroupLabel(groupBy, key);
    } else {
      label = getGroupLabel(groupBy, key);
    }
    return { key, label, items: bucketItems };
  });
  remaining.sort((a, b) => a.label.localeCompare(b.label));

  return [...ordered, ...remaining];
}

const COLLAPSE_PREFIX = "tasks-collapsed";

export function collapseStorageKey(
  orgId: string,
  groupBy: TaskGroupBy
): string {
  return `${COLLAPSE_PREFIX}:${orgId}:${groupBy}`;
}

export function readCollapsedSet(
  orgId: string,
  groupBy: TaskGroupBy
): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(collapseStorageKey(orgId, groupBy));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((v) => typeof v === "string"));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

export function writeCollapsedSet(
  orgId: string,
  groupBy: TaskGroupBy,
  collapsed: Set<string>
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      collapseStorageKey(orgId, groupBy),
      JSON.stringify(Array.from(collapsed))
    );
  } catch {
    // Storage may be blocked; ignore.
  }
}
