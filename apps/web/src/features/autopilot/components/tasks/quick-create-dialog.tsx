"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconBug,
  IconBulb,
  IconChecklist,
  IconEqual,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuickType = "task" | "bug" | "story";
type QuickPriority = "critical" | "high" | "medium" | "low";

interface QuickCreateDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
}

const TYPE_OPTIONS: ReadonlyArray<{
  icon: typeof IconChecklist;
  label: string;
  value: QuickType;
}> = [
  { value: "task", label: "Task", icon: IconChecklist },
  { value: "story", label: "Story", icon: IconBulb },
  { value: "bug", label: "Bug", icon: IconBug },
];

const PRIORITY_OPTIONS: ReadonlyArray<{
  className: string;
  icon: typeof IconAlertTriangle;
  label: string;
  value: QuickPriority;
}> = [
  {
    value: "critical",
    label: "Critical",
    icon: IconAlertTriangle,
    className: "text-red-500",
  },
  {
    value: "high",
    label: "High",
    icon: IconArrowUp,
    className: "text-orange-500",
  },
  {
    value: "medium",
    label: "Medium",
    icon: IconEqual,
    className: "text-yellow-500",
  },
  {
    value: "low",
    label: "Low",
    icon: IconArrowDown,
    className: "text-blue-400",
  },
];

export function QuickCreateDialog({
  open,
  onOpenChange,
  organizationId,
}: QuickCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<QuickType>("task");
  const [priority, setPriority] = useState<QuickPriority>("medium");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createWorkItem = useMutation(
    api.autopilot.mutations.work.createWorkItem
  );

  useEffect(
    function resetOnClose() {
      if (!open) {
        setTitle("");
        setType("task");
        setPriority("medium");
        setSubmitting(false);
      }
    },
    [open]
  );

  useEffect(
    function focusOnOpen() {
      if (open) {
        const handle = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(handle);
      }
      return undefined;
    },
    [open]
  );

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      await createWorkItem({
        organizationId,
        type,
        title: trimmed,
        description: "",
        priority,
        status: "todo",
      });
      toast.success("Task created");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create task";
      toast.error(message);
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    // Plain Enter and Cmd/Ctrl+Enter both submit when the title is non-empty.
    event.preventDefault();
    handleSubmit().catch(() => undefined);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Quick create task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 p-4">
          <Input
            aria-label="Task title"
            className="border-0 bg-transparent p-0! text-base shadow-none! focus-visible:ring-0!"
            disabled={submitting}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Issue title"
            ref={inputRef}
            value={title}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center gap-1 rounded-md bg-muted/50 p-0.5"
              role="tablist"
            >
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = option.value === type;
                return (
                  <button
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60"
                    )}
                    key={option.value}
                    onClick={() => setType(option.value)}
                    type="button"
                  >
                    <Icon className="size-3.5" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
            <fieldset className="inline-flex items-center gap-1 border-0 p-0">
              <legend className="sr-only">Priority</legend>
              {PRIORITY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = option.value === priority;
                return (
                  <button
                    aria-label={`Priority: ${option.label}`}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60"
                    )}
                    key={option.value}
                    onClick={() => setPriority(option.value)}
                    type="button"
                  >
                    <Icon className={cn("size-3.5", option.className)} />
                  </button>
                );
              })}
            </fieldset>
          </div>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2">
          <span className="text-muted-foreground text-xs">
            Press Enter to create
          </span>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={!canSubmit} onClick={handleSubmit} size="sm">
              Create task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
