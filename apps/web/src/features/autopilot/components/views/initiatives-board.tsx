"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconColumns,
  IconFilter,
  IconLayoutList,
  IconSortAscending,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueRow } from "@/features/autopilot/components/issue-row";
import {
  KanbanBoard,
  type KanbanColumn,
} from "@/features/autopilot/components/kanban-board";
import {
  type GroupKey,
  getPriorityRank,
  getStatusRank,
  getStoredView,
  isGroupKey,
  isSortKey,
  persistView,
  QUICK_FILTERS,
  type SortKey,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  type ViewMode,
} from "@/features/autopilot/components/views/initiatives-board-constants";
import { GroupedList } from "@/features/autopilot/components/views/initiatives-board-grouped-list";
import { cn } from "@/lib/utils";

type InitiativeKanbanItem = Doc<"autopilotWorkItems"> & { id: string };

function InitiativeKanbanCard({ item }: { item: InitiativeKanbanItem }) {
  return (
    <IssueRow
      completionPercent={item.completionPercent}
      priority={item.priority}
      status={item.status}
      title={item.title}
      updatedAt={item.updatedAt}
    />
  );
}

export function InitiativesBoard({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredView);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [groupKey, setGroupKey] = useState<GroupKey>("status");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const initiatives = useQuery(api.autopilot.queries.work.listWorkItems, {
    organizationId,
    type: "initiative",
  });

  function toggleView(mode: ViewMode) {
    setViewMode(mode);
    persistView(mode);
  }

  function selectGroupKey(value: string | null) {
    if (value && isGroupKey(value)) {
      setGroupKey(value);
    }
  }

  function selectSortKey(value: string | null) {
    if (value && isSortKey(value)) {
      setSortKey(value);
    }
  }

  function sortInitiatives(
    items: Doc<"autopilotWorkItems">[]
  ): Doc<"autopilotWorkItems">[] {
    return items.slice().sort((a, b) => {
      if (sortKey === "status") {
        return getStatusRank(a.status) - getStatusRank(b.status);
      }

      if (sortKey === "priority") {
        return getPriorityRank(a.priority) - getPriorityRank(b.priority);
      }

      if (sortKey === "updated") {
        return b.updatedAt - a.updatedAt;
      }

      return b.createdAt - a.createdAt;
    });
  }

  if (initiatives === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton
            className="h-12 w-full rounded-md"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  const filtered =
    statusFilter.length > 0
      ? initiatives.filter((i) => statusFilter.includes(i.status))
      : initiatives;
  const sorted = sortInitiatives(filtered);

  const kanbanColumns = STATUS_ORDER.reduce<
    KanbanColumn<InitiativeKanbanItem>[]
  >((columns, status) => {
    if (status === "cancelled") {
      return columns;
    }

    columns.push({
      id: status,
      label: STATUS_LABELS[status] ?? status,
      color: STATUS_COLORS[status] ?? "bg-muted-foreground",
      items: [],
    });
    return columns;
  }, []);
  const kanbanColumnByStatus = new Map(
    kanbanColumns.map((column) => [column.id, column])
  );

  for (const initiative of sorted) {
    const column = kanbanColumnByStatus.get(initiative.status);
    if (column) {
      column.items.push({ ...initiative, id: initiative._id });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {QUICK_FILTERS.map((preset) => {
            const isActive =
              preset.statuses.length === 0
                ? statusFilter.length === 0
                : preset.statuses.length === statusFilter.length &&
                  preset.statuses.every((s) => statusFilter.includes(s));
            return (
              <Button
                className={cn(
                  "h-7 rounded-full px-2.5 text-xs",
                  isActive &&
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                key={preset.label}
                onClick={() =>
                  setStatusFilter(isActive ? [] : [...preset.statuses])
                }
                size="sm"
                variant={isActive ? "default" : "outline"}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex rounded-md border">
          <Button
            className={cn(
              "rounded-none rounded-l-md",
              viewMode === "list" && "bg-muted"
            )}
            onClick={() => toggleView("list")}
            size="sm"
            variant="ghost"
          >
            <IconLayoutList className="size-4" />
          </Button>
          <Button
            className={cn(
              "rounded-none rounded-r-md",
              viewMode === "kanban" && "bg-muted"
            )}
            onClick={() => toggleView("kanban")}
            size="sm"
            variant="ghost"
          >
            <IconColumns className="size-4" />
          </Button>
        </div>

        {viewMode === "list" && (
          <Select onValueChange={selectGroupKey} value={groupKey}>
            <SelectTrigger className="w-32">
              <IconFilter className="mr-1 size-3" />
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select onValueChange={selectSortKey} value={sortKey}>
          <SelectTrigger className="w-32">
            <IconSortAscending className="mr-1 size-3" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="created">Created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {initiatives.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          No initiatives yet
        </div>
      )}

      {sorted.length > 0 && viewMode === "kanban" && (
        <KanbanBoard
          columns={kanbanColumns}
          itemComponent={InitiativeKanbanCard}
        />
      )}

      {sorted.length > 0 && viewMode === "list" && (
        <div className="overflow-hidden rounded-xl border border-border">
          {groupKey === "none" ? (
            sorted.map((initiative) => (
              <IssueRow
                completionPercent={initiative.completionPercent}
                key={initiative._id}
                priority={initiative.priority}
                status={initiative.status}
                title={initiative.title}
                updatedAt={initiative.updatedAt}
              />
            ))
          ) : (
            <GroupedList groupKey={groupKey} items={sorted} />
          )}
        </div>
      )}

      {sorted.length === 0 && initiatives.length > 0 && (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          No initiatives match the current filter
        </div>
      )}
    </div>
  );
}
