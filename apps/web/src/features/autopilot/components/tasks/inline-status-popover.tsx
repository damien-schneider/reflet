"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconCircleX,
  IconInbox,
  IconLoader2,
  IconProgress,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STATUS_ORDER } from "@/features/autopilot/components/views/initiatives-board-constants";
import { cn } from "@/lib/utils";

export type WorkItemStatus = (typeof STATUS_ORDER)[number];

interface StatusEntry {
  color: string;
  icon: typeof IconInbox;
  label: string;
  value: WorkItemStatus;
}

export const STATUS_CONFIG: Record<WorkItemStatus, StatusEntry> = {
  triage: {
    value: "triage",
    label: "Triage",
    icon: IconInbox,
    color: "text-amber-500",
  },
  backlog: {
    value: "backlog",
    label: "Backlog",
    icon: IconCircleDashed,
    color: "text-muted-foreground",
  },
  todo: {
    value: "todo",
    label: "To Do",
    icon: IconCircleDashed,
    color: "text-blue-400",
  },
  in_progress: {
    value: "in_progress",
    label: "In Progress",
    icon: IconLoader2,
    color: "text-blue-500",
  },
  in_review: {
    value: "in_review",
    label: "In Review",
    icon: IconProgress,
    color: "text-purple-500",
  },
  done: {
    value: "done",
    label: "Done",
    icon: IconCircleCheck,
    color: "text-green-500",
  },
  cancelled: {
    value: "cancelled",
    label: "Cancelled",
    icon: IconCircleX,
    color: "text-muted-foreground",
  },
};

export function getStatusEntry(status: string): StatusEntry {
  const knownStatus = STATUS_ORDER.find((value) => value === status);
  return knownStatus ? STATUS_CONFIG[knownStatus] : STATUS_CONFIG.backlog;
}

export function InlineStatusPopover({
  workItemId,
  status,
  disabled,
  showLabel = true,
}: {
  workItemId: Id<"autopilotWorkItems">;
  status: string;
  disabled?: boolean;
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const updateWorkItem = useMutation(
    api.autopilot.mutations.work.updateWorkItem
  );
  const current = getStatusEntry(status);
  const Icon = current.icon;

  const handleSelect = async (
    event: React.MouseEvent<HTMLButtonElement>,
    nextStatus: WorkItemStatus
  ) => {
    event.stopPropagation();
    setOpen(false);
    if (nextStatus === status) {
      return;
    }
    try {
      await updateWorkItem({ workItemId, status: nextStatus });
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button
            aria-label={`Status: ${current.label}. Click to change.`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs transition-colors hover:bg-muted",
              "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            )}
            disabled={disabled}
            onClick={(event) => event.stopPropagation()}
            type="button"
          />
        }
      >
        <Icon className={cn("size-4 shrink-0", current.color)} />
        {showLabel ? (
          <span className="text-muted-foreground">{current.label}</span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 gap-0.5 p-1"
        onClick={(event) => event.stopPropagation()}
      >
        {STATUS_ORDER.map((value) => {
          const entry = STATUS_CONFIG[value];
          const EntryIcon = entry.icon;
          const isActive = value === status;
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
