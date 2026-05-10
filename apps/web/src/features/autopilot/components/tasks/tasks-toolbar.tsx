"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconChecklist,
  IconLayoutKanban,
  IconSearch,
  IconSortDescending,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { GroupBySelect } from "./group-by-select";
import { SavedViewsMenu } from "./saved-views-menu";
import {
  TASK_SORT_KEYS,
  type TaskFilters,
  type TaskSortKey,
  type TaskViewMode,
} from "./use-tasks-filters";

const VIEW_TABS: Array<{
  id: TaskViewMode;
  label: string;
  icon: typeof IconChecklist;
}> = [
  { id: "list", label: "List", icon: IconChecklist },
  { id: "board", label: "Board", icon: IconLayoutKanban },
];

const SORT_LABELS: Record<TaskSortKey, string> = {
  updated: "Updated",
  created: "Created",
  priority: "Priority",
  status: "Status",
  due: "Due date",
};

export interface TasksToolbarProps {
  filters: TaskFilters;
  isAdmin: boolean;
  onSearchChange: (value: string) => void;
  organizationId: Id<"organizations">;
  searchValue: string;
  setFilters: (update: Partial<TaskFilters>) => void;
}

export function TasksToolbar({
  organizationId,
  filters,
  setFilters,
  isAdmin,
  searchValue,
  onSearchChange,
}: TasksToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-xs flex-1">
        <IconSearch className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search tasks"
          className="h-8 pl-8"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search tasks…"
          value={searchValue}
        />
      </div>

      <SavedViewsMenu
        applyFilters={setFilters}
        filters={filters}
        isAdmin={isAdmin}
        organizationId={organizationId}
      />

      <GroupBySelect
        onChange={(groupBy) => setFilters({ groupBy })}
        value={filters.groupBy}
      />

      <Select
        onValueChange={(value) => setFilters({ sortKey: value as TaskSortKey })}
        value={filters.sortKey}
      >
        <SelectTrigger className="h-8 w-36 gap-1.5">
          <IconSortDescending className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TASK_SORT_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {SORT_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex gap-1 rounded-lg bg-muted/50 p-1">
        {VIEW_TABS.map((tab) => (
          <Button
            aria-pressed={filters.viewMode === tab.id}
            className={cn(
              "h-7 gap-1.5 px-2.5",
              filters.viewMode === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={tab.id}
            onClick={() => setFilters({ viewMode: tab.id })}
            size="sm"
            variant="ghost"
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
