"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { H2 } from "@/components/ui/typography";
import { BulkActionsBar } from "@/features/autopilot/components/tasks/bulk-actions-bar";
import { CommandPalette } from "@/features/autopilot/components/tasks/command-palette";
import { CreateTaskDialog } from "@/features/autopilot/components/tasks/create/dialog";
import { groupItems } from "@/features/autopilot/components/tasks/group-items";
import { TaskListView } from "@/features/autopilot/components/tasks/list/view";
import { QuickCreateDialog } from "@/features/autopilot/components/tasks/quick-create-dialog";
import { sortItems } from "@/features/autopilot/components/tasks/sort-items";
import { TasksFilterBar } from "@/features/autopilot/components/tasks/tasks-filter-bar";
import { TasksToolbar } from "@/features/autopilot/components/tasks/tasks-toolbar";
import {
  TASK_AGENTS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type TaskAgent,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  useTasksFilters,
} from "@/features/autopilot/components/tasks/use-tasks-filters";
import { useTasksHotkeys } from "@/features/autopilot/components/tasks/use-tasks-hotkeys";
import { InitiativesBoard } from "@/features/autopilot/components/views/initiatives-board";

const DEBOUNCE_MS = 200;

function isOneOf<T extends string>(
  values: readonly T[],
  value: string | undefined
): value is T {
  return value !== undefined && values.some((candidate) => candidate === value);
}

interface TasksPageBodyProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function TasksPageBody({
  organizationId,
  isAdmin,
  orgSlug,
}: TasksPageBodyProps) {
  const router = useRouter();
  const { filters, setFilters, reset, isDefault } = useTasksFilters();
  const [searchInput, setSearchInput] = useState(filters.q);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [debouncedSearch] = useDebouncedValue(searchInput, {
    wait: DEBOUNCE_MS,
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(
    function syncDebouncedSearch() {
      if (debouncedSearch !== filters.q) {
        setFilters({ q: debouncedSearch });
      }
    },
    [debouncedSearch, filters.q, setFilters]
  );

  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;
  useEffect(
    function syncFromFilters() {
      if (
        filters.q !== searchInputRef.current &&
        filters.q !== debouncedSearch
      ) {
        setSearchInput(filters.q);
      }
    },
    [filters.q, debouncedSearch]
  );

  const members = useQuery(api.organizations.members.list, { organizationId });
  const labels = useQuery(api.autopilot.queries.labels.listLabels, {
    organizationId,
  });

  const memberOptions = (members ?? []).map((member) => ({
    userId: member.userId,
    name: member.user?.name ?? null,
    email: member.user?.email ?? null,
  }));

  const queryArgs: {
    assignedAgent?: TaskAgent;
    assigneeUserId?: string;
    organizationId: Id<"organizations">;
    priority?: TaskPriority;
    status?: TaskStatus;
    type?: TaskType;
  } = { organizationId };
  const typeFilter = filters.type[0];
  if (filters.type.length === 1 && isOneOf(TASK_TYPES, typeFilter)) {
    queryArgs.type = typeFilter;
  }
  const statusFilter = filters.status[0];
  if (filters.status.length === 1 && isOneOf(TASK_STATUSES, statusFilter)) {
    queryArgs.status = statusFilter;
  }
  if (isOneOf(TASK_AGENTS, filters.assignedAgent)) {
    queryArgs.assignedAgent = filters.assignedAgent;
  }
  if (filters.assigneeUserId !== "") {
    queryArgs.assigneeUserId = filters.assigneeUserId;
  }
  const priorityFilter = filters.priority[0];
  if (
    filters.priority.length === 1 &&
    isOneOf(TASK_PRIORITIES, priorityFilter)
  ) {
    queryArgs.priority = priorityFilter;
  }

  const isSearching = filters.q.trim().length > 0;
  const listed = useQuery(
    api.autopilot.queries.work.listWorkItems,
    isSearching ? "skip" : queryArgs
  );
  const searched = useQuery(
    api.autopilot.queries.work.searchWorkItems,
    isSearching ? { organizationId, query: filters.q.trim() } : "skip"
  );

  const tasks = isSearching ? searched : listed;
  const isLoading = tasks === undefined;

  const labelLookup = new Map<string, string>();
  for (const label of labels ?? []) {
    labelLookup.set(label._id, label.name);
  }

  const filteredTasks = (tasks ?? []).filter((task) => {
    if (filters.status.length > 0 && !filters.status.includes(task.status)) {
      return false;
    }
    if (filters.type.length > 0 && !filters.type.includes(task.type)) {
      return false;
    }
    if (
      filters.priority.length > 0 &&
      !filters.priority.includes(task.priority)
    ) {
      return false;
    }
    if (
      filters.assignedAgent !== "" &&
      task.assignedAgent !== filters.assignedAgent
    ) {
      return false;
    }
    if (
      filters.assigneeUserId !== "" &&
      task.assigneeUserId !== filters.assigneeUserId
    ) {
      return false;
    }
    return true;
  });

  const sortedTasks = sortItems(filteredTasks, filters.sortKey);
  const grouped = groupItems(
    sortedTasks,
    filters.groupBy,
    undefined,
    labelLookup
  );

  const [selected, setSelected] = useState<Set<Id<"autopilotWorkItems">>>(
    () => new Set()
  );
  const lastClickedIndexRef = useRef<number | null>(null);
  const flatOrder = grouped.flatMap((group) =>
    group.items.map((item) => item._id)
  );

  const clearSelection = () => {
    setSelected(new Set());
    lastClickedIndexRef.current = null;
  };

  const toggleSelect = (id: Id<"autopilotWorkItems">, index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    lastClickedIndexRef.current = index;
  };

  const toggleRangeSelect = (id: Id<"autopilotWorkItems">, index: number) => {
    const last = lastClickedIndexRef.current;
    if (last === null) {
      toggleSelect(id, index);
      return;
    }
    const start = Math.min(last, index);
    const end = Math.max(last, index);
    setSelected((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i += 1) {
        const candidate = flatOrder[i];
        if (candidate) {
          next.add(candidate);
        }
      }
      return next;
    });
  };

  useEffect(
    function bindEscapeKey() {
      function onKey(event: KeyboardEvent) {
        if (event.key === "Escape" && selected.size > 0) {
          setSelected(new Set());
          lastClickedIndexRef.current = null;
        }
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    },
    [selected.size]
  );

  useEffect(
    function pruneStaleSelection() {
      if (selected.size === 0) {
        return;
      }
      const visible = new Set(flatOrder);
      let mutated = false;
      const next = new Set<Id<"autopilotWorkItems">>();
      for (const id of selected) {
        if (visible.has(id)) {
          next.add(id);
        } else {
          mutated = true;
        }
      }
      if (mutated) {
        setSelected(next);
      }
    },
    [flatOrder, selected]
  );

  const selectedIds = Array.from(selected);

  const handleOpenFocused = (rowIndex: number) => {
    const id = flatOrder[rowIndex];
    if (!id) {
      return;
    }
    router.push(`/dashboard/${orgSlug}/tasks/${id}`);
  };

  const navigationTargets = {
    tasks: `/dashboard/${orgSlug}/tasks`,
    roadmap: `/dashboard/${orgSlug}/autopilot/roadmap`,
    inbox: `/dashboard/${orgSlug}/inbox`,
  };

  useTasksHotkeys({
    enabled: !(paletteOpen || quickOpen),
    navigationTargets,
    onClearSelection: clearSelection,
    onOpenFocused: handleOpenFocused,
    onPaletteOpen: () => setPaletteOpen(true),
    onQuickCreate: () => setQuickOpen(true),
  });

  return (
    <div className="min-h-[calc(100svh-3.5rem)] px-3 pt-2 pb-24 sm:px-5">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 rounded-xl border bg-card/70 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">All issues</p>
            <H2 className="truncate" variant="card">
              Tasks
            </H2>
          </div>
          {isAdmin && (
            <CreateTaskDialog
              isOpen={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              organizationId={organizationId}
              teamKey={orgSlug}
            />
          )}
        </div>

        <div className="space-y-3 border-b px-3 py-3">
          <TasksToolbar
            filters={filters}
            isAdmin={isAdmin}
            onSearchChange={setSearchInput}
            organizationId={organizationId}
            searchValue={searchInput}
            setFilters={setFilters}
          />

          <TasksFilterBar
            filters={filters}
            isDefault={isDefault}
            labels={labels ?? undefined}
            members={memberOptions}
            onReset={() => {
              setSearchInput("");
              reset();
            }}
            setFilters={setFilters}
          />
        </div>

        <div className="px-3 pb-3">
          {filters.viewMode === "board" ? (
            <InitiativesBoard organizationId={organizationId} />
          ) : (
            <TaskListView
              groupBy={filters.groupBy}
              grouped={grouped}
              isLoading={isLoading}
              onCreateClick={() => setIsCreateOpen(true)}
              orgId={organizationId}
              orgSlug={orgSlug}
              selected={selected}
              toggleRangeSelect={toggleRangeSelect}
              toggleSelect={toggleSelect}
            />
          )}
        </div>
      </div>

      <BulkActionsBar
        isAdmin={isAdmin}
        members={memberOptions}
        onClear={clearSelection}
        organizationId={organizationId}
        selectedIds={selectedIds}
      />

      <CommandPalette
        filters={filters}
        onCreate={() => setQuickOpen(true)}
        onOpenChange={(next) => {
          setPaletteOpen(next);
          if (!next) {
            setPaletteQuery("");
          }
        }}
        open={paletteOpen}
        organizationId={organizationId}
        orgSlug={orgSlug}
        query={paletteQuery}
        setFilters={setFilters}
        setQuery={setPaletteQuery}
      />
      <QuickCreateDialog
        onOpenChange={setQuickOpen}
        open={quickOpen}
        organizationId={organizationId}
      />
    </div>
  );
}
