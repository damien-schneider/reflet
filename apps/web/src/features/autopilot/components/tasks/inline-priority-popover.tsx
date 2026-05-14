"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconEqual,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type WorkItemPriority = "critical" | "high" | "medium" | "low";

const PRIORITY_ORDER: readonly WorkItemPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

interface PriorityEntry {
  badgeClass: string;
  color: string;
  icon: typeof IconAlertTriangle;
  label: string;
  value: WorkItemPriority;
}

const PRIORITY_CONFIG: Record<WorkItemPriority, PriorityEntry> = {
  critical: {
    value: "critical",
    label: "Critical",
    icon: IconAlertTriangle,
    color: "text-red-500",
    badgeClass: "bg-red-500/10 text-red-500 border-red-500/30",
  },
  high: {
    value: "high",
    label: "High",
    icon: IconArrowUp,
    color: "text-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  },
  medium: {
    value: "medium",
    label: "Medium",
    icon: IconEqual,
    color: "text-yellow-500",
    badgeClass: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  },
  low: {
    value: "low",
    label: "Low",
    icon: IconArrowDown,
    color: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

export function getPriorityEntry(priority: string): PriorityEntry {
  const knownPriority = PRIORITY_ORDER.find((value) => value === priority);
  return knownPriority ? PRIORITY_CONFIG[knownPriority] : PRIORITY_CONFIG.low;
}

export function InlinePriorityPopover({
  workItemId,
  priority,
  disabled,
  showLabel = true,
}: {
  workItemId: Id<"autopilotWorkItems">;
  priority: string;
  disabled?: boolean;
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const updateWorkItem = useMutation(
    api.autopilot.mutations.work.updateWorkItem
  );
  const current = getPriorityEntry(priority);
  const Icon = current.icon;

  const handleSelect = async (
    event: React.MouseEvent<HTMLButtonElement>,
    nextPriority: WorkItemPriority
  ) => {
    event.stopPropagation();
    setOpen(false);
    if (nextPriority === priority) {
      return;
    }
    try {
      await updateWorkItem({ workItemId, priority: nextPriority });
    } catch {
      toast.error("Failed to update priority");
    }
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button
            aria-label={`Priority: ${current.label}. Click to change.`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-xs transition-colors",
              current.badgeClass
            )}
            disabled={disabled}
            onClick={(event) => event.stopPropagation()}
            type="button"
          />
        }
      >
        <Icon className="size-3.5 shrink-0" />
        {showLabel ? <span>{current.label}</span> : null}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-48 gap-0.5 p-1"
        onClick={(event) => event.stopPropagation()}
      >
        {PRIORITY_ORDER.map((value) => {
          const entry = PRIORITY_CONFIG[value];
          const EntryIcon = entry.icon;
          const isActive = value === priority;
          return (
            <button
              aria-pressed={isActive}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                isActive && "bg-muted/60"
              )}
              key={value}
              onClick={(event) => handleSelect(event, value)}
              type="button"
            >
              <EntryIcon className={cn("size-4 shrink-0", entry.color)} />
              <span className="flex-1">{entry.label}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
