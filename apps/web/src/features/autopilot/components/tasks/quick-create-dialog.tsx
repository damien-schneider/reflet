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
  parentId?: Id<"autopilotWorkItems">;
}

interface QuickCreateState {
  priority: QuickPriority;
  submitting: boolean;
  title: string;
  type: QuickType;
}

const INITIAL_QUICK_CREATE_STATE: QuickCreateState = {
  title: "",
  type: "task",
  priority: "medium",
  submitting: false,
};

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
  parentId,
}: QuickCreateDialogProps) {
  const [form, setForm] = useState(INITIAL_QUICK_CREATE_STATE);
  const inputRef = useRef<HTMLInputElement>(null);

  const createWorkItem = useMutation(
    api.autopilot.mutations.work.createWorkItem
  );

  useEffect(
    function resetOnClose() {
      if (!open) {
        setForm(INITIAL_QUICK_CREATE_STATE);
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

  const trimmed = form.title.trim();
  const canSubmit = trimmed.length > 0 && !form.submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setForm((current) => ({ ...current, submitting: true }));
    try {
      await createWorkItem({
        organizationId,
        type: form.type,
        parentId,
        title: trimmed,
        description: "",
        priority: form.priority,
        status: "todo",
      });
      toast.success(parentId ? "Sub-issue created" : "Task created");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create task";
      toast.error(message);
      setForm((current) => ({ ...current, submitting: false }));
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
          <DialogTitle>
            {parentId ? "Quick create sub-issue" : "Quick create task"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 p-4">
          <Input
            aria-label="Task title"
            className="border-0 bg-transparent p-0! text-base shadow-none! focus-visible:ring-0!"
            disabled={form.submitting}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            onKeyDown={handleKeyDown}
            placeholder={parentId ? "Sub-issue title" : "Issue title"}
            ref={inputRef}
            value={form.title}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center gap-1 rounded-md bg-muted/50 p-0.5"
              role="tablist"
            >
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = option.value === form.type;
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
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        type: option.value,
                      }))
                    }
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
                const active = option.value === form.priority;
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
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        priority: option.value,
                      }))
                    }
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
              {parentId ? "Create sub-issue" : "Create task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
