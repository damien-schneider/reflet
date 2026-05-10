"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconPlus } from "@tabler/icons-react";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { H2, H3, Muted } from "@/components/ui/typography";
import { TaskCard } from "@/features/autopilot/components/task-card";
import { BulkActionsBar } from "@/features/autopilot/components/tasks/bulk-actions-bar";
import {
  groupItems,
  readCollapsedSet,
  writeCollapsedSet,
} from "@/features/autopilot/components/tasks/group-items";
import { sortItems } from "@/features/autopilot/components/tasks/sort-items";
import { TasksFilterBar } from "@/features/autopilot/components/tasks/tasks-filter-bar";
import { TasksToolbar } from "@/features/autopilot/components/tasks/tasks-toolbar";
import {
  type TaskAgent,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  useTasksFilters,
} from "@/features/autopilot/components/tasks/use-tasks-filters";
import { InitiativesBoard } from "@/features/autopilot/components/views/initiatives-board";
import { cn } from "@/lib/utils";

type WorkItem = Doc<"autopilotWorkItems">;

const DEBOUNCE_MS = 200;

export default function TasksPageClient() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string | undefined) ?? "";
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const membership = useQuery(
    api.organizations.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  if (org === undefined) {
    return <TasksLoadingSkeleton />;
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  return (
    <TasksPageBody
      isAdmin={isAdmin}
      organizationId={org._id}
      orgSlug={orgSlug}
    />
  );
}

interface TasksPageBodyProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

function TasksPageBody({
  organizationId,
  isAdmin,
  orgSlug,
}: TasksPageBodyProps) {
  const { filters, setFilters, reset, isDefault } = useTasksFilters();
  const [searchInput, setSearchInput] = useState(filters.q);
  const [debouncedSearch] = useDebouncedValue(searchInput, {
    wait: DEBOUNCE_MS,
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Push debounced search into URL state.
  useEffect(
    function syncDebouncedSearch() {
      if (debouncedSearch !== filters.q) {
        setFilters({ q: debouncedSearch });
      }
    },
    [debouncedSearch, filters.q, setFilters]
  );

  // Keep local input in sync when URL changes externally (e.g. saved view).
  // searchInput intentionally read via ref to avoid a feedback loop.
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

  const memberOptions = useMemo(
    () =>
      (members ?? []).map((member) => ({
        userId: member.userId,
        name: member.user?.name ?? null,
        email: member.user?.email ?? null,
      })),
    [members]
  );

  // Backend filters by single equality only; remaining filters apply client-side.
  const queryArgs = useMemo(() => {
    const args: {
      assignedAgent?: TaskAgent;
      assigneeUserId?: string;
      organizationId: Id<"organizations">;
      priority?: TaskPriority;
      status?: TaskStatus;
      type?: TaskType;
    } = { organizationId };
    if (filters.type.length === 1) {
      args.type = filters.type[0] as TaskType;
    }
    if (filters.status.length === 1) {
      args.status = filters.status[0] as TaskStatus;
    }
    if (filters.assignedAgent !== "") {
      args.assignedAgent = filters.assignedAgent as TaskAgent;
    }
    if (filters.assigneeUserId !== "") {
      args.assigneeUserId = filters.assigneeUserId;
    }
    if (filters.priority.length === 1) {
      args.priority = filters.priority[0] as TaskPriority;
    }
    return args;
  }, [filters, organizationId]);

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

  const labelLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const label of labels ?? []) {
      map.set(label._id as unknown as string, label.name);
    }
    return map;
  }, [labels]);

  const filteredTasks = useMemo(() => {
    if (!tasks) {
      return [];
    }
    return tasks.filter((task) => {
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
  }, [tasks, filters]);

  const sortedTasks = useMemo(
    () => sortItems(filteredTasks, filters.sortKey),
    [filteredTasks, filters.sortKey]
  );

  const grouped = useMemo(
    () => groupItems(sortedTasks, filters.groupBy, undefined, labelLookup),
    [sortedTasks, filters.groupBy, labelLookup]
  );

  // Selection state
  const [selected, setSelected] = useState<Set<Id<"autopilotWorkItems">>>(
    () => new Set()
  );
  const lastClickedIndexRef = useRef<number | null>(null);
  const flatOrder = useMemo(
    () => grouped.flatMap((group) => group.items.map((item) => item._id)),
    [grouped]
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    lastClickedIndexRef.current = null;
  }, []);

  const toggleSelect = useCallback(
    (id: Id<"autopilotWorkItems">, index: number) => {
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
    },
    []
  );

  const toggleRangeSelect = useCallback(
    (id: Id<"autopilotWorkItems">, index: number) => {
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
    },
    [flatOrder, toggleSelect]
  );

  // Esc clears selection.
  useEffect(
    function bindEscapeKey() {
      function onKey(event: KeyboardEvent) {
        if (event.key === "Escape" && selected.size > 0) {
          clearSelection();
        }
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    },
    [selected.size, clearSelection]
  );

  // Reset selection when filtering hides selected ids.
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

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return (
    <div className="space-y-4 p-6 pb-24">
      <div className="flex items-center justify-between">
        <H2 variant="card">Tasks</H2>
        {isAdmin && (
          <CreateTaskDialog
            isOpen={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            organizationId={organizationId}
          />
        )}
      </div>

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

      <BulkActionsBar
        isAdmin={isAdmin}
        members={memberOptions}
        onClear={clearSelection}
        organizationId={organizationId}
        selectedIds={selectedIds}
      />
    </div>
  );
}

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

function TaskListView({
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

  // Pre-compute index offsets so range selection references stable indices.
  let cursor = 0;
  const groupOffsets = grouped.map((group) => {
    const offset = cursor;
    cursor += group.items.length;
    return offset;
  });

  return (
    <div className="space-y-4">
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
    readCollapsedSet(orgId as unknown as string, groupBy)
  );

  useEffect(
    function readPersistedCollapsed() {
      setCollapsed(readCollapsedSet(orgId as unknown as string, groupBy));
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
    writeCollapsedSet(orgId as unknown as string, groupBy, next);
  };

  const isUngrouped = groupKey === "all";

  return (
    <section>
      {!isUngrouped && (
        <button
          aria-expanded={!isCollapsed}
          className="mb-2 flex items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-muted/50"
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
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {label}
          </span>
          <span className="text-muted-foreground text-xs">{items.length}</span>
        </button>
      )}
      {!isCollapsed && (
        <div className="space-y-2">
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
        "group/task-row flex items-start gap-2 rounded-lg",
        isSelected && "bg-primary/5 ring-1 ring-primary/40"
      )}
      data-index={index}
    >
      <button
        aria-label={isSelected ? "Deselect task" : "Select task"}
        aria-pressed={isSelected}
        className={cn(
          "mt-4 ml-2 shrink-0 transition-opacity",
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
      <div className="min-w-0 flex-1">
        <TaskCard task={task} />
      </div>
    </div>
  );
}

function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton
          className="h-20 w-full rounded-lg"
          key={`task-skel-${String(i)}`}
        />
      ))}
    </div>
  );
}

function TasksLoadingSkeleton() {
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

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
}

function CreateTaskDialog({
  isOpen,
  onOpenChange,
  organizationId,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<"task" | "bug" | "story">("task");
  const [taskPriority, setTaskPriority] = useState<
    "critical" | "high" | "medium" | "low"
  >("medium");
  const [isPublic, setIsPublic] = useState(false);

  const createTask = useMutation(api.autopilot.mutations.work.createWorkItem);

  const handleCreate = async () => {
    if (!(title.trim() && description.trim())) {
      toast.error("Title and description are required");
      return;
    }

    try {
      await createTask({
        organizationId,
        type: taskType,
        title: title.trim(),
        description: description.trim(),
        priority: taskPriority,
        isPublicRoadmap: isPublic || undefined,
      });
      toast.success("Task created");
      setTitle("");
      setDescription("");
      setTaskType("task");
      setTaskPriority("medium");
      setIsPublic(false);
      onOpenChange(false);
    } catch {
      toast.error("Failed to create task");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogTrigger render={<Button className="gap-2" size="sm" />}>
        <IconPlus className="size-4" />
        New Task
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-task-title">Title</Label>
            <Input
              id="new-task-title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              value={title}
            />
          </div>
          <div>
            <Label htmlFor="new-task-desc">Description</Label>
            <Textarea
              id="new-task-desc"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task in detail..."
              rows={4}
              value={description}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-task-type">Type</Label>
              <Select
                onValueChange={(v) =>
                  setTaskType(v as "task" | "bug" | "story")
                }
                value={taskType}
              >
                <SelectTrigger id="new-task-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-task-priority">Priority</Label>
              <Select
                onValueChange={(v) =>
                  setTaskPriority(v as "critical" | "high" | "medium" | "low")
                }
                value={taskPriority}
              >
                <SelectTrigger id="new-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium text-sm" htmlFor="public-toggle">
                Public Roadmap
              </Label>
              <p className="text-muted-foreground text-xs">
                Show this task on the public roadmap
              </p>
            </div>
            <Switch
              checked={isPublic}
              id="public-toggle"
              onCheckedChange={setIsPublic}
            />
          </div>
          <Button className="w-full" onClick={handleCreate}>
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
