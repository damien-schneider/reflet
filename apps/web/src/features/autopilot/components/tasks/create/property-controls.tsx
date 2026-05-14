"use client";

import {
  IconBug,
  IconBulb,
  IconChecklist,
  IconWorld,
} from "@tabler/icons-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CreateTaskType } from "@/features/autopilot/components/tasks/create/state";
import {
  getPriorityEntry,
  type WorkItemPriority,
} from "@/features/autopilot/components/tasks/inline-priority-popover";
import {
  getStatusEntry,
  STATUS_CONFIG,
  type WorkItemStatus,
} from "@/features/autopilot/components/tasks/inline-status-popover";
import { TASK_PRIORITIES } from "@/features/autopilot/components/tasks/use-tasks-filters";
import { STATUS_ORDER } from "@/features/autopilot/components/views/initiatives-board-constants";
import { cn } from "@/lib/utils";

interface TypeEntry {
  icon: typeof IconChecklist;
  label: string;
  value: CreateTaskType;
}

const DEFAULT_TYPE_ENTRY: TypeEntry = {
  value: "task",
  label: "Task",
  icon: IconChecklist,
};

const TYPE_OPTIONS = [
  DEFAULT_TYPE_ENTRY,
  { value: "story", label: "Story", icon: IconBulb },
  { value: "bug", label: "Bug", icon: IconBug },
] satisfies readonly TypeEntry[];

function getTypeEntry(value: CreateTaskType): TypeEntry {
  return (
    TYPE_OPTIONS.find((option) => option.value === value) ?? DEFAULT_TYPE_ENTRY
  );
}

export function CreateProperties({
  isPublic,
  onPriorityChange,
  onPublicChange,
  onStatusChange,
  onTypeChange,
  priority,
  status,
  type,
}: {
  isPublic: boolean;
  onPriorityChange: (value: WorkItemPriority) => void;
  onPublicChange: (value: boolean) => void;
  onStatusChange: (value: WorkItemStatus) => void;
  onTypeChange: (value: CreateTaskType) => void;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  type: CreateTaskType;
}) {
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2 border-t py-4">
      <StatusControl onChange={onStatusChange} value={status} />
      <PriorityControl onChange={onPriorityChange} value={priority} />
      <TypeControl onChange={onTypeChange} value={type} />
      <Button
        aria-label={`Public roadmap: ${isPublic ? "On" : "Off"}`}
        aria-pressed={isPublic}
        className={cn(
          "h-8 rounded-full border-border/70 bg-muted/60 px-3 text-muted-foreground",
          isPublic && "border-primary/30 bg-primary/10 text-primary"
        )}
        onClick={() => onPublicChange(!isPublic)}
        size="sm"
        type="button"
        variant="outline"
      >
        <IconWorld className="size-4" />
        Public roadmap
      </Button>
    </div>
  );
}

function StatusControl({
  onChange,
  value,
}: {
  onChange: (value: WorkItemStatus) => void;
  value: WorkItemStatus;
}) {
  const [open, setOpen] = useState(false);
  const current = getStatusEntry(value);
  const CurrentIcon = current.icon;
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Status: ${current.label}`}
            className="h-8 rounded-full border-border/70 bg-muted/60 px-3 text-foreground"
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <CurrentIcon className={cn("size-4", current.color)} />
        {current.label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-0.5 p-1">
        {STATUS_ORDER.map((option) => {
          const entry = STATUS_CONFIG[option];
          const EntryIcon = entry.icon;
          return (
            <PropertyOption
              active={option === value}
              key={option}
              onSelect={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <EntryIcon className={cn("size-4", entry.color)} />
              {entry.label}
            </PropertyOption>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function PriorityControl({
  onChange,
  value,
}: {
  onChange: (value: WorkItemPriority) => void;
  value: WorkItemPriority;
}) {
  const [open, setOpen] = useState(false);
  const current = getPriorityEntry(value);
  const CurrentIcon = current.icon;
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Priority: ${current.label}`}
            className="h-8 rounded-full border-border/70 bg-muted/60 px-3 text-muted-foreground"
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <CurrentIcon className={cn("size-4", current.color)} />
        {current.label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 gap-0.5 p-1">
        {TASK_PRIORITIES.map((option) => {
          const entry = getPriorityEntry(option);
          const EntryIcon = entry.icon;
          return (
            <PropertyOption
              active={option === value}
              key={option}
              onSelect={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <EntryIcon className={cn("size-4", entry.color)} />
              {entry.label}
            </PropertyOption>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function TypeControl({
  onChange,
  value,
}: {
  onChange: (value: CreateTaskType) => void;
  value: CreateTaskType;
}) {
  const [open, setOpen] = useState(false);
  const current = getTypeEntry(value);
  const CurrentIcon = current.icon;
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Type: ${current.label}`}
            className="h-8 rounded-full border-border/70 bg-muted/60 px-3 text-muted-foreground"
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <CurrentIcon className="size-4" />
        {current.label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 gap-0.5 p-1">
        {TYPE_OPTIONS.map((option) => {
          const EntryIcon = option.icon;
          return (
            <PropertyOption
              active={option.value === value}
              key={option.value}
              onSelect={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <EntryIcon className="size-4" />
              {option.label}
            </PropertyOption>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function PropertyOption({
  active,
  children,
  onSelect,
}: {
  active: boolean;
  children: ReactNode;
  onSelect: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      className={cn(
        "w-full justify-start rounded-md px-2 text-muted-foreground",
        active && "bg-muted text-foreground"
      )}
      onClick={onSelect}
      size="sm"
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
