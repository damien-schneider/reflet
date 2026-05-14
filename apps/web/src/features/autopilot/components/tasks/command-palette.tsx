"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconChecklist,
  IconFilter,
  IconInbox,
  IconLayoutBoard,
  IconLayoutList,
  IconMap,
  IconPlus,
  IconRoute,
  IconTag,
} from "@tabler/icons-react";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type {
  TaskFilters,
  TaskPriority,
  TaskStatus,
  TaskViewMode,
} from "@/features/autopilot/components/tasks/use-tasks-filters";

const SEARCH_DEBOUNCE_MS = 200;
const RECENT_COUNT = 8;

interface CommandPaletteProps {
  filters: TaskFilters;
  onCreate: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
  query: string;
  setFilters: (update: Partial<TaskFilters>) => Promise<URLSearchParams>;
  setQuery: (value: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  organizationId,
  orgSlug,
  onCreate,
  query,
  setQuery,
  filters,
  setFilters,
}: CommandPaletteProps) {
  const { push } = useRouter();
  const trimmedInput = query.trim();
  const [debounced] = useDebouncedValue(trimmedInput, {
    wait: SEARCH_DEBOUNCE_MS,
  });

  // Recent tasks always loaded so the palette feels instant.
  const recent = useQuery(
    api.autopilot.queries.work.listWorkItems,
    open ? { organizationId } : "skip"
  );
  const searched = useQuery(
    api.autopilot.queries.work.searchWorkItems,
    open && debounced.length > 0 ? { organizationId, query: debounced } : "skip"
  );

  const isSearching = trimmedInput.length > 0;
  const tasksForList = isSearching
    ? (searched ?? [])
    : (recent ?? []).slice(0, RECENT_COUNT);

  const close = () => onOpenChange(false);

  const goto = (path: string) => {
    close();
    push(path);
  };

  const onSelectTask = (task: Doc<"autopilotWorkItems">) => {
    goto(`/dashboard/${orgSlug}/tasks/${task._id}`);
  };

  const onCreateClick = () => {
    close();
    onCreate();
  };

  const applyFilters = (update: Partial<TaskFilters>) => {
    setFilters(update).catch(() => undefined);
    close();
  };

  const onSetViewMode = (mode: TaskViewMode) => {
    applyFilters({ viewMode: mode });
  };

  const toggleStatus = (status: TaskStatus) => {
    const isActive = filters.status.includes(status);
    applyFilters({ status: isActive ? [] : [status] });
  };

  const togglePriority = (priority: TaskPriority) => {
    const isActive = filters.priority.includes(priority);
    applyFilters({ priority: isActive ? [] : [priority] });
  };

  return (
    <CommandDialog
      description="Search tasks, switch views, jump anywhere"
      onOpenChange={onOpenChange}
      open={open}
      title="Tasks command palette"
    >
      <Command shouldFilter={false}>
        <CommandInput
          onValueChange={setQuery}
          placeholder="Search tasks, run an action…"
          value={query}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? "No tasks match your search." : "No results."}
          </CommandEmpty>

          {tasksForList.length > 0 && (
            <CommandGroup heading={isSearching ? "Tasks" : "Recent tasks"}>
              {tasksForList.map((task) => (
                <CommandItem
                  key={task._id}
                  onSelect={() => onSelectTask(task)}
                  value={`task:${task._id}`}
                >
                  <IconChecklist className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{task.title}</span>
                  {task.identifier ? (
                    <span className="font-mono text-muted-foreground text-xs">
                      {task.identifier}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          <CommandGroup heading="Create new">
            <CommandItem onSelect={onCreateClick} value="create:new-task">
              <IconPlus className="size-4" />
              <span className="flex-1">New task…</span>
              <span className="text-muted-foreground text-xs">C</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Switch view">
            <CommandItem
              onSelect={() => onSetViewMode("list")}
              value="view:list"
            >
              <IconLayoutList className="size-4" />
              <span className="flex-1">List view</span>
              {filters.viewMode === "list" ? (
                <span className="text-muted-foreground text-xs">Active</span>
              ) : null}
            </CommandItem>
            <CommandItem
              onSelect={() => onSetViewMode("board")}
              value="view:board"
            >
              <IconLayoutBoard className="size-4" />
              <span className="flex-1">Board view</span>
              {filters.viewMode === "board" ? (
                <span className="text-muted-foreground text-xs">Active</span>
              ) : null}
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Filters">
            <CommandItem
              onSelect={() => toggleStatus("todo")}
              value="filter:status-todo"
            >
              <IconFilter className="size-4" />
              <span className="flex-1">Filter: To do</span>
            </CommandItem>
            <CommandItem
              onSelect={() => toggleStatus("in_progress")}
              value="filter:status-in-progress"
            >
              <IconFilter className="size-4" />
              <span className="flex-1">Filter: In progress</span>
            </CommandItem>
            <CommandItem
              onSelect={() => toggleStatus("triage")}
              value="filter:status-triage"
            >
              <IconFilter className="size-4" />
              <span className="flex-1">Filter: Triage</span>
            </CommandItem>
            <CommandItem
              onSelect={() => togglePriority("critical")}
              value="filter:priority-critical"
            >
              <IconFilter className="size-4" />
              <span className="flex-1">Filter: Critical priority</span>
            </CommandItem>
            <CommandItem
              onSelect={() => togglePriority("high")}
              value="filter:priority-high"
            >
              <IconFilter className="size-4" />
              <span className="flex-1">Filter: High priority</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigate">
            <CommandItem
              onSelect={() => goto(`/dashboard/${orgSlug}/tasks`)}
              value="nav:tasks"
            >
              <IconChecklist className="size-4" />
              <span className="flex-1">Go to Tasks</span>
              <span className="text-muted-foreground text-xs">G T</span>
            </CommandItem>
            <CommandItem
              onSelect={() => goto(`/dashboard/${orgSlug}/autopilot/roadmap`)}
              value="nav:roadmap"
            >
              <IconRoute className="size-4" />
              <span className="flex-1">Go to Roadmap</span>
              <span className="text-muted-foreground text-xs">G R</span>
            </CommandItem>
            <CommandItem
              onSelect={() => goto(`/dashboard/${orgSlug}/inbox`)}
              value="nav:inbox"
            >
              <IconInbox className="size-4" />
              <span className="flex-1">Go to Inbox</span>
              <span className="text-muted-foreground text-xs">G I</span>
            </CommandItem>
            <CommandItem
              onSelect={() => goto(`/dashboard/${orgSlug}/labels`)}
              value="nav:labels"
            >
              <IconTag className="size-4" />
              <span className="flex-1">Go to Labels</span>
            </CommandItem>
            <CommandItem
              onSelect={() => goto(`/${orgSlug}/roadmap`)}
              value="nav:public-roadmap"
            >
              <IconMap className="size-4" />
              <span className="flex-1">Go to Public roadmap</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
