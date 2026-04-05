"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconColumns,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconLayoutList,
  IconSortAscending,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";

type ViewMode = "list" | "kanban";
type SortKey = "status" | "priority" | "updated" | "created";
type GroupKey = "status" | "priority" | "none";

const QUICK_FILTERS = [
  { label: "All", statuses: [] as string[] },
  { label: "Active", statuses: ["backlog", "todo", "in_progress"] },
  { label: "Completed", statuses: ["done"] },
  { label: "Paused", statuses: ["in_review", "cancelled"] },
] as const;

const STATUS_ORDER = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
] as const;

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-blue-500",
  in_progress: "bg-amber-500",
  in_review: "bg-purple-500",
  done: "bg-green-500",
  cancelled: "bg-red-500",
};

const PRIORITY_ORDER = ["critical", "high", "medium", "low"] as const;

const COLUMN_OPTIONS = [
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
  { key: "updated", label: "Updated" },
  { key: "created", label: "Created" },
] as const;

type ColumnKey = (typeof COLUMN_OPTIONS)[number]["key"];

const STORAGE_KEY_VIEW = "autopilot-initiatives-view";
const STORAGE_KEY_COLS = "autopilot-initiatives-columns";

function getStoredView(): ViewMode {
  if (typeof window === "undefined") {
    return "list";
  }
  return (localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode) ?? "list";
}

function getStoredColumns(): Set<ColumnKey> {
  if (typeof window === "undefined") {
    return new Set(["status", "priority", "updated"]);
  }
  const stored = localStorage.getItem(STORAGE_KEY_COLS);
  if (stored) {
    return new Set(JSON.parse(stored) as ColumnKey[]);
  }
  return new Set(["status", "priority", "updated"]);
}

export function InitiativesBoard({
  organizationId,
}: {
  organizationId: string;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredView);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [groupKey, setGroupKey] = useState<GroupKey>("status");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] =
    useState<Set<ColumnKey>>(getStoredColumns);

  const initiatives = useQuery(api.autopilot.queries.work.listWorkItems, {
    organizationId: organizationId as never,
    type: "initiative",
  });

  function toggleView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY_VIEW, mode);
  }

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify([...next]));
      return next;
    });
  }

  function sortInitiatives(
    items: Doc<"autopilotWorkItems">[]
  ): Doc<"autopilotWorkItems">[] {
    return [...items].sort((a, b) => {
      switch (sortKey) {
        case "status":
          return (
            STATUS_ORDER.indexOf(a.status as (typeof STATUS_ORDER)[number]) -
            STATUS_ORDER.indexOf(b.status as (typeof STATUS_ORDER)[number])
          );
        case "priority":
          return (
            PRIORITY_ORDER.indexOf(
              a.priority as (typeof PRIORITY_ORDER)[number]
            ) -
            PRIORITY_ORDER.indexOf(
              b.priority as (typeof PRIORITY_ORDER)[number]
            )
          );
        case "updated":
          return b.updatedAt - a.updatedAt;
        case "created":
          return b.createdAt - a.createdAt;
        default:
          return 0;
      }
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

  const filtered = (
    statusFilter.length > 0
      ? initiatives.filter((i) => statusFilter.includes(i.status))
      : initiatives
  ) as Doc<"autopilotWorkItems">[];
  const sorted = sortInitiatives(filtered);

  const kanbanColumns: KanbanColumn<
    Doc<"autopilotWorkItems"> & { id: string }
  >[] = STATUS_ORDER.filter((s) => s !== "cancelled").map((status) => ({
    id: status,
    label: STATUS_LABELS[status] ?? status,
    color: STATUS_COLORS[status] ?? "bg-muted-foreground",
    items: sorted
      .filter((i) => i.status === status)
      .map((i) => ({ ...i, id: i._id })),
  }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick filters */}
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
          <Select
            onValueChange={(v) => setGroupKey(v as GroupKey)}
            value={groupKey}
          >
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

        <Select onValueChange={(v) => setSortKey(v as SortKey)} value={sortKey}>
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

        {/* B6: Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
            {visibleColumns.size < COLUMN_OPTIONS.length ? (
              <IconEyeOff className="mr-1 size-3" />
            ) : (
              <IconEye className="mr-1 size-3" />
            )}
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COLUMN_OPTIONS.map((col) => (
              <DropdownMenuCheckboxItem
                checked={visibleColumns.has(col.key)}
                key={col.key}
                onCheckedChange={() => toggleColumn(col.key)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Views */}
      {initiatives.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          No initiatives yet
        </div>
      )}

      {sorted.length > 0 && viewMode === "kanban" && (
        <KanbanBoard
          columns={kanbanColumns}
          renderItem={(item) => (
            <IssueRow
              completionPercent={item.completionPercent}
              priority={item.priority}
              status={item.status}
              title={item.title}
              updatedAt={item.updatedAt}
            />
          )}
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

function GroupedList({
  items,
  groupKey,
}: {
  items: Doc<"autopilotWorkItems">[];
  groupKey: "status" | "priority";
}) {
  const groups = groupKey === "status" ? STATUS_ORDER : PRIORITY_ORDER;

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const filtered = items.filter((i) =>
          groupKey === "status" ? i.status === group : i.priority === group
        );
        if (filtered.length === 0) {
          return null;
        }

        return (
          <div key={group}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  groupKey === "status"
                    ? (STATUS_COLORS[group] ?? "bg-muted-foreground")
                    : "bg-muted-foreground"
                )}
              />
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {groupKey === "status"
                  ? (STATUS_LABELS[group] ?? group)
                  : group}
              </span>
              <span className="text-muted-foreground text-xs">
                {filtered.length}
              </span>
            </div>
            <div>
              {filtered.map((initiative) => (
                <IssueRow
                  completionPercent={initiative.completionPercent}
                  key={initiative._id}
                  priority={initiative.priority}
                  status={initiative.status}
                  title={initiative.title}
                  updatedAt={initiative.updatedAt}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
