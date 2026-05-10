"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconCheck, IconPlus } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label as LabelControl } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  DEFAULT_LABEL_COLOR_ID,
  LABEL_COLORS,
  type LabelColorId,
} from "./label-colors";
import { LabelPill } from "./label-pill";

interface CreateLabelDialogProps {
  className?: string;
  /** Existing labels — used to dedupe names and offer parents. */
  existingLabels: readonly Doc<"workItemLabels">[];
  organizationId: Id<"organizations">;
  /** Optional render override for the trigger button. */
  triggerLabel?: string;
}

const NO_PARENT_VALUE = "__none__";

/**
 * Admin dialog for creating a new label.
 *
 * - Name is trimmed and deduplicated (case-insensitive) against the supplied
 *   `existingLabels`. The submit button is disabled while the name is empty
 *   or duplicate.
 * - Color is selected from the shared {@link LABEL_COLORS} preset.
 * - Parent is optional and limited to top-level labels (single level of
 *   nesting in this iteration).
 */
export function CreateLabelDialog({
  organizationId,
  existingLabels,
  triggerLabel = "New label",
  className,
}: CreateLabelDialogProps) {
  const nameId = useId();
  const colorGroupId = useId();
  const parentId = useId();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [colorId, setColorId] = useState<LabelColorId>(DEFAULT_LABEL_COLOR_ID);
  const [parentValue, setParentValue] = useState<string>(NO_PARENT_VALUE);
  const [submitting, setSubmitting] = useState(false);

  const createLabel = useMutation(api.autopilot.mutations.labels.createLabel);

  const topLevelParents = useMemo(
    () => existingLabels.filter((label) => !label.parentLabelId),
    [existingLabels]
  );

  const trimmedName = name.trim();
  const isDuplicate = useMemo(() => {
    if (trimmedName.length === 0) {
      return false;
    }
    const lower = trimmedName.toLowerCase();
    return existingLabels.some(
      (label) => label.name.trim().toLowerCase() === lower
    );
  }, [existingLabels, trimmedName]);

  const canSubmit = trimmedName.length > 0 && !isDuplicate && !submitting;

  const reset = () => {
    setName("");
    setColorId(DEFAULT_LABEL_COLOR_ID);
    setParentValue(NO_PARENT_VALUE);
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      reset();
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      const parentLabelId =
        parentValue === NO_PARENT_VALUE
          ? undefined
          : (parentValue as Id<"workItemLabels">);
      await createLabel({
        organizationId,
        name: trimmedName,
        color: colorId,
        parentLabelId,
      });
      toast.success(`Label "${trimmedName}" created`);
      handleOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create label";
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger
        render={
          <Button className={cn("gap-2", className)} size="sm">
            <IconPlus className="size-4" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create label</DialogTitle>
          <DialogDescription>
            Labels group work items across types. Pick a color and an optional
            parent.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit().catch(() => {
              // Errors surfaced via toast inside handleSubmit.
            });
          }}
        >
          <div className="space-y-2">
            <LabelControl htmlFor={nameId}>Name</LabelControl>
            <Input
              autoFocus
              id={nameId}
              maxLength={64}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Frontend"
              value={name}
            />
            {isDuplicate ? (
              <p className="text-destructive text-xs">
                A label with this name already exists.
              </p>
            ) : null}
          </div>

          <fieldset
            aria-labelledby={`${colorGroupId}-legend`}
            className="space-y-2"
          >
            <legend
              className="font-medium text-sm"
              id={`${colorGroupId}-legend`}
            >
              Color
            </legend>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((color) => {
                const selected = color.id === colorId;
                return (
                  <button
                    aria-label={color.label}
                    aria-pressed={selected}
                    className={cn(
                      "relative flex size-7 items-center justify-center rounded-full ring-1 ring-border transition-all",
                      color.swatch,
                      selected
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                        : "hover:ring-foreground/40"
                    )}
                    key={color.id}
                    onClick={() => setColorId(color.id)}
                    type="button"
                  >
                    {selected ? (
                      <IconCheck className="size-3.5 text-white drop-shadow" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {topLevelParents.length > 0 ? (
            <div className="space-y-2">
              <LabelControl htmlFor={parentId}>Parent (optional)</LabelControl>
              <Select
                onValueChange={(value) =>
                  setParentValue(value ?? NO_PARENT_VALUE)
                }
                value={parentValue}
              >
                <SelectTrigger className="w-full" id={parentId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT_VALUE}>No parent</SelectItem>
                  {topLevelParents.map((parent) => (
                    <SelectItem key={parent._id} value={parent._id}>
                      {parent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
            <span className="text-muted-foreground text-xs">Preview</span>
            <LabelPill
              color={colorId}
              name={trimmedName.length > 0 ? trimmedName : "Label name"}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={!canSubmit} type="submit">
              {submitting ? "Creating…" : "Create label"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
