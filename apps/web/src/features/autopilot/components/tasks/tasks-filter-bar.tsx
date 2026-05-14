"use client";

import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconChevronDown,
  IconFilter,
  IconRotate,
  IconX,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  TASK_AGENTS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type TaskFilters,
} from "./use-tasks-filters";

type WorkLabel = Doc<"workItemLabels">;

const STATUS_LABELS: Record<string, string> = {
  triage: "Triage",
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

const TYPE_LABELS: Record<string, string> = {
  initiative: "Initiative",
  story: "Story",
  task: "Task",
  spec: "Spec",
  bug: "Bug",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const AGENT_LABELS: Record<string, string> = {
  ceo: "CEO",
  pm: "PM",
  cto: "CTO",
  dev: "Dev",
  growth: "Growth",
  orchestrator: "Orchestrator",
  sales: "Sales",
  support: "Support",
  system: "System",
  validator: "Validator",
};

export interface TasksFilterBarProps {
  filters: TaskFilters;
  isDefault: boolean;
  labels?: WorkLabel[];
  members?: Array<{
    email: string | null;
    name: string | null;
    userId: string;
  }>;
  onReset: () => void;
  setFilters: (update: Partial<TaskFilters>) => void;
}

export function TasksFilterBar({
  filters,
  setFilters,
  onReset,
  isDefault,
  members,
  labels,
}: TasksFilterBarProps) {
  const toggleArrayValue = (
    key: "status" | "type" | "priority" | "labelIds",
    value: string
  ) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const updateByKey: Record<
      typeof key,
      (values: string[]) => Partial<TaskFilters>
    > = {
      status: (status) => ({ status }),
      type: (type) => ({ type }),
      priority: (priority) => ({ priority }),
      labelIds: (labelIds) => ({ labelIds }),
    };
    setFilters(updateByKey[key](next));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelectChip
        active={filters.status.length > 0}
        count={filters.status.length}
        label="Status"
      >
        <ChipOptions
          onClear={() => setFilters({ status: [] })}
          options={TASK_STATUSES.map((s) => ({
            value: s,
            label: STATUS_LABELS[s] ?? s,
          }))}
          selected={filters.status}
          toggle={(value) => toggleArrayValue("status", value)}
        />
      </MultiSelectChip>

      <MultiSelectChip
        active={filters.type.length > 0}
        count={filters.type.length}
        label="Type"
      >
        <ChipOptions
          onClear={() => setFilters({ type: [] })}
          options={TASK_TYPES.map((t) => ({
            value: t,
            label: TYPE_LABELS[t] ?? t,
          }))}
          selected={filters.type}
          toggle={(value) => toggleArrayValue("type", value)}
        />
      </MultiSelectChip>

      <MultiSelectChip
        active={filters.priority.length > 0}
        count={filters.priority.length}
        label="Priority"
      >
        <ChipOptions
          onClear={() => setFilters({ priority: [] })}
          options={TASK_PRIORITIES.map((p) => ({
            value: p,
            label: PRIORITY_LABELS[p] ?? p,
          }))}
          selected={filters.priority}
          toggle={(value) => toggleArrayValue("priority", value)}
        />
      </MultiSelectChip>

      <SingleSelectChip
        active={filters.assignedAgent !== ""}
        label="Agent"
        value={
          filters.assignedAgent
            ? (AGENT_LABELS[filters.assignedAgent] ?? filters.assignedAgent)
            : null
        }
      >
        <SingleOptions
          onClear={() => setFilters({ assignedAgent: "" })}
          options={TASK_AGENTS.map((a) => ({
            value: a,
            label: AGENT_LABELS[a] ?? a,
          }))}
          select={(value) => setFilters({ assignedAgent: value })}
          selected={filters.assignedAgent}
        />
      </SingleSelectChip>

      <SingleSelectChip
        active={filters.assigneeUserId !== ""}
        label="Assignee"
        value={
          filters.assigneeUserId
            ? (members?.find((m) => m.userId === filters.assigneeUserId)
                ?.name ??
              members?.find((m) => m.userId === filters.assigneeUserId)
                ?.email ??
              "Selected")
            : null
        }
      >
        <SingleOptions
          onClear={() => setFilters({ assigneeUserId: "" })}
          options={(members ?? []).map((m) => ({
            value: m.userId,
            label: m.name ?? m.email ?? m.userId,
          }))}
          select={(value) => setFilters({ assigneeUserId: value })}
          selected={filters.assigneeUserId}
        />
      </SingleSelectChip>

      {labels && labels.length > 0 && (
        <MultiSelectChip
          active={filters.labelIds.length > 0}
          count={filters.labelIds.length}
          label="Labels"
        >
          <ChipOptions
            onClear={() => setFilters({ labelIds: [] })}
            options={labels.map((l) => ({
              value: l._id,
              label: l.name,
            }))}
            selected={filters.labelIds}
            toggle={(value) => toggleArrayValue("labelIds", value)}
          />
        </MultiSelectChip>
      )}

      {!isDefault && (
        <Button
          aria-label="Reset filters"
          className="gap-1.5"
          onClick={onReset}
          size="sm"
          variant="ghost"
        >
          <IconRotate className="size-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}

function MultiSelectChip({
  active,
  count,
  label,
  children,
}: {
  active: boolean;
  count: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className={cn(
              "h-8 gap-1.5 rounded-full border-transparent bg-muted/40 px-3 text-muted-foreground hover:bg-muted hover:text-foreground",
              active &&
                "border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
            )}
            size="sm"
            variant="outline"
          />
        }
      >
        <IconFilter className="size-3.5" />
        {label}
        {count > 0 && (
          <Badge className="ml-0.5 px-1.5" variant="secondary">
            {count}
          </Badge>
        )}
        <IconChevronDown className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function SingleSelectChip({
  active,
  label,
  value,
  children,
}: {
  active: boolean;
  label: string;
  value: string | null;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className={cn(
              "h-8 gap-1.5 rounded-full border-transparent bg-muted/40 px-3 text-muted-foreground hover:bg-muted hover:text-foreground",
              active &&
                "border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
            )}
            size="sm"
            variant="outline"
          />
        }
      >
        <IconFilter className="size-3.5" />
        {label}
        {value && (
          <Badge className="ml-0.5 px-1.5" variant="secondary">
            {value}
          </Badge>
        )}
        <IconChevronDown className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function ChipOptions({
  options,
  selected,
  toggle,
  onClear,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  toggle: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <button
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            key={opt.value}
            onClick={() => toggle(opt.value)}
            type="button"
          >
            <Checkbox checked={checked} tabIndex={-1} />
            <span className="flex-1">{opt.label}</span>
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          className="mt-1 flex items-center gap-2 rounded-md border-t px-2 py-1.5 text-left text-muted-foreground text-sm hover:text-foreground"
          onClick={onClear}
          type="button"
        >
          <IconX className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}

function SingleOptions({
  options,
  selected,
  select,
  onClear,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string;
  select: (value: string) => void;
  onClear: () => void;
}) {
  if (options.length === 0) {
    return (
      <p className="px-2 py-3 text-center text-muted-foreground text-xs">
        No options
      </p>
    );
  }
  return (
    <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
      {options.map((opt) => {
        const checked = selected === opt.value;
        return (
          <button
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
              checked && "bg-accent"
            )}
            key={opt.value}
            onClick={() => select(opt.value)}
            type="button"
          >
            <span className="flex-1">{opt.label}</span>
          </button>
        );
      })}
      {selected !== "" && (
        <button
          className="mt-1 flex items-center gap-2 rounded-md border-t px-2 py-1.5 text-left text-muted-foreground text-sm hover:text-foreground"
          onClick={onClear}
          type="button"
        >
          <IconX className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
