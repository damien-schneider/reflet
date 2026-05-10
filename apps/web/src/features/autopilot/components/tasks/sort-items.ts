import type { Doc } from "@reflet/backend/convex/_generated/dataModel";

import {
  getPriorityRank,
  getStatusRank,
} from "@/features/autopilot/components/views/initiatives-board-constants";

import type { TaskSortKey } from "./use-tasks-filters";

type WorkItem = Doc<"autopilotWorkItems">;

const TRIAGE_RANK = -1;

function statusRankWithTriage(status: string): number {
  if (status === "triage") {
    return TRIAGE_RANK;
  }
  return getStatusRank(status);
}

export function sortItems(
  items: readonly WorkItem[],
  sortKey: TaskSortKey
): WorkItem[] {
  const copy = items.slice();
  if (sortKey === "updated") {
    copy.sort((a, b) => b.updatedAt - a.updatedAt);
    return copy;
  }
  if (sortKey === "created") {
    copy.sort((a, b) => b.createdAt - a.createdAt);
    return copy;
  }
  if (sortKey === "priority") {
    copy.sort(
      (a, b) =>
        getPriorityRank(a.priority) - getPriorityRank(b.priority) ||
        b.updatedAt - a.updatedAt
    );
    return copy;
  }
  if (sortKey === "status") {
    copy.sort(
      (a, b) =>
        statusRankWithTriage(a.status) - statusRankWithTriage(b.status) ||
        b.updatedAt - a.updatedAt
    );
    return copy;
  }
  if (sortKey === "due") {
    copy.sort((a, b) => {
      const aDue = a.dueDate ?? Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ?? Number.POSITIVE_INFINITY;
      if (aDue !== bDue) {
        return aDue - bDue;
      }
      return b.updatedAt - a.updatedAt;
    });
    return copy;
  }
  return copy;
}
