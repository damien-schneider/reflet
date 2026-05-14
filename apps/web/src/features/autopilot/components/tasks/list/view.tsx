"use client";

import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { H3, Muted } from "@/components/ui/typography";
import { TaskCard } from "@/features/autopilot/components/task-card";
import {
  type groupItems,
  readCollapsedSet,
  writeCollapsedSet,
} from "@/features/autopilot/components/tasks/group-items";
import type { TaskFilters } from "@/features/autopilot/components/tasks/use-tasks-filters";
import { cn } from "@/lib/utils";

type WorkItem = Doc<"autopilotWorkItems">;

interface TaskListViewProps {
  groupBy: TaskFilters["groupBy"];
  grouped: ReturnType<typeof groupItems>;
  isLoading: boolean;
  onCreateClick: () => void;
  orgId: Id<"organizations">;
  orgSlug: string;
  selected: Set<Id<"autopilotWorkItems">>;
  toggleRangeSelect: (id: Id<"autopilotWorkItems">, index: number) => void;
  toggleSelect: (id: Id<"autopilotWorkItems">, index: number) => void;
}

export function TaskListView({
  grouped,
  groupBy,
  isLoading,
  onCreateClick,
  orgId,
  orgSlug: slug,
  selected,
  toggleRangeSelect,
  toggleSelect,
}: TaskListViewProps) {
  const isEmpty = grouped.every((group) => group.items.length === 0);

  if (isLoading) {
    return <TaskListSkeleton />;
  }

  if (isEmpty) {
    return <TasksEmptyState onCreate={onCreateClick} orgSlug={slug} />;
  }

  let cursor = 0;
  const groupOffsets = grouped.map((group) => {
    const offset = cursor;
    cursor += group.items.length;
    return offset;
  });

  return (
    <div className="space-y-2">
      {grouped.map((group, groupIndex) => {
        if (group.items.length === 0) {
          return null;
        }
        return (
          <TaskListGroup
            groupBy={groupBy}
            groupKey={group.key}
            indexOffset={groupOffsets[groupIndex] ?? 0}
            items={group.items}
            key={group.key}
            label={group.label}
            orgId={orgId}
            selected={selected}
            toggleRangeSelect={toggleRangeSelect}
            toggleSelect={toggleSelect}
          />
        );
      })}
    </div>
  );
}

interface TaskListGroupProps {
  groupBy: TaskFilters["groupBy"];
  groupKey: string;
  indexOffset: number;
  items: WorkItem[];
  label: string;
  orgId: Id<"organizations">;
  selected: Set<Id<"autopilotWorkItems">>;
  toggleRangeSelect: (id: Id<"autopilotWorkItems">, index: number) => void;
  toggleSelect: (id: Id<"autopilotWorkItems">, index: number) => void;
}

function TaskListGroup({
  groupBy,
  groupKey,
  label,
  items,
  indexOffset,
  orgId,
  selected,
  toggleSelect,
  toggleRangeSelect,
}: TaskListGroupProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    readCollapsedSet(orgId, groupBy)
  );

  useEffect(
    function readPersistedCollapsed() {
      setCollapsed(readCollapsedSet(orgId, groupBy));
    },
    [orgId, groupBy]
  );

  const isCollapsed = collapsed.has(groupKey);
  const toggleCollapse = () => {
    const next = new Set(collapsed);
    if (next.has(groupKey)) {
      next.delete(groupKey);
    } else {
      next.add(groupKey);
    }
    setCollapsed(next);
    writeCollapsedSet(orgId, groupBy, next);
  };

  const isUngrouped = groupKey === "all";

  return (
    <section className="overflow-hidden rounded-lg border bg-background/35">
      {!isUngrouped && (
        <button
          aria-expanded={!isCollapsed}
          className="flex h-10 w-full items-center gap-2 border-b bg-muted/35 px-3 text-left transition-colors hover:bg-muted/55"
          onClick={toggleCollapse}
          type="button"
        >
          <span
            className={cn(
              "transition-transform",
              isCollapsed ? "rotate-0" : "rotate-90"
            )}
          >
            ▸
          </span>
          <span className="font-medium text-sm">{label}</span>
          <span className="text-muted-foreground text-xs">{items.length}</span>
          <span className="ml-auto text-lg text-muted-foreground leading-none">
            +
          </span>
        </button>
      )}
      {!isCollapsed && (
        <div>
          {items.map((task, idxInGroup) => {
            const flatIndex = indexOffset + idxInGroup;
            return (
              <TaskRow
                index={flatIndex}
                isSelected={selected.has(task._id)}
                key={task._id}
                onToggle={(modifiers) => {
                  if (modifiers.shift) {
                    toggleRangeSelect(task._id, flatIndex);
                  } else {
                    toggleSelect(task._id, flatIndex);
                  }
                }}
                task={task}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

interface TaskRowProps {
  index: number;
  isSelected: boolean;
  onToggle: (modifiers: { shift: boolean }) => void;
  task: WorkItem;
}

function TaskRow({ task, index, isSelected, onToggle }: TaskRowProps) {
  return (
    <div
      className={cn(
        "group/task-row grid grid-cols-[2rem_minmax(0,1fr)] items-center border-b transition-colors last:border-b-0 hover:bg-muted/35",
        isSelected && "bg-primary/5"
      )}
      data-index={index}
      data-task-row=""
    >
      <button
        aria-label={isSelected ? "Deselect task" : "Select task"}
        aria-pressed={isSelected}
        className={cn(
          "flex size-8 items-center justify-center transition-opacity",
          isSelected
            ? "opacity-100"
            : "opacity-0 focus-visible:opacity-100 group-hover/task-row:opacity-100"
        )}
        onClick={(event) => {
          event.stopPropagation();
          onToggle({ shift: event.shiftKey });
        }}
        type="button"
      >
        <Checkbox checked={isSelected} tabIndex={-1} />
      </button>
      <div className="min-w-0">
        <TaskCard task={task} />
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-background/35">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton
          className="h-11 w-full rounded-none border-b last:border-b-0"
          key={`task-skel-${String(i)}`}
        />
      ))}
    </div>
  );
}

export function TasksLoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton className="h-8 w-28" key={`tb-${String(i)}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton className="h-8 w-24" key={`fb-${String(i)}`} />
        ))}
      </div>
      <TaskListSkeleton />
    </div>
  );
}

function TasksEmptyState({
  onCreate,
  orgSlug: slug,
}: {
  onCreate: () => void;
  orgSlug: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <H3 variant="card">No tasks match these filters</H3>
      <Muted>Create a task or import existing feedback to get started.</Muted>
      <div className="mt-2 flex gap-2">
        <Button onClick={onCreate}>Create task</Button>
        <a
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 font-medium text-sm transition-colors hover:bg-muted"
          href={`/dashboard/${slug}/feedback`}
        >
          Import from feedback
        </a>
      </div>
    </div>
  );
}
