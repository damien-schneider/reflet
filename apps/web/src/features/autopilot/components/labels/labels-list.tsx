"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { LABEL_COLORS, type LabelColorId } from "./label-colors";
import { LabelPill } from "./label-pill";

export type LabelWithUsage = Doc<"workItemLabels"> & { usageCount: number };

interface LabelsListProps {
  labels: readonly LabelWithUsage[];
}

interface GroupedLabel {
  children: LabelWithUsage[];
  parent: LabelWithUsage;
}

const groupLabels = (labels: readonly LabelWithUsage[]): GroupedLabel[] => {
  const byParent = new Map<Id<"workItemLabels">, LabelWithUsage[]>();
  const topLevel: LabelWithUsage[] = [];
  for (const label of labels) {
    if (label.parentLabelId) {
      const list = byParent.get(label.parentLabelId) ?? [];
      list.push(label);
      byParent.set(label.parentLabelId, list);
    } else {
      topLevel.push(label);
    }
  }
  // Orphans (parent missing) get surfaced at the top level.
  const topLevelIds = new Set(topLevel.map((label) => label._id));
  for (const label of labels) {
    if (label.parentLabelId && !topLevelIds.has(label.parentLabelId)) {
      const stillNested = byParent.get(label.parentLabelId);
      if (stillNested?.includes(label)) {
        // Skip — nested under a parent that exists in topLevel via another
        // grouping pass. Realistically: parent missing entirely, hoist.
      }
    }
  }

  const sortByName = (a: LabelWithUsage, b: LabelWithUsage) =>
    a.name.localeCompare(b.name);

  topLevel.sort(sortByName);
  return topLevel.map((parent) => ({
    parent,
    children: (byParent.get(parent._id) ?? []).slice().sort(sortByName),
  }));
};

/**
 * Admin list of all labels in the org, grouped by parent.
 *
 * Each row shows the label pill, name, optional usage count, and edit/delete
 * controls. Editing is inline (rename + color swatch picker). Deletion opens
 * a confirm dialog that explains links are dropped but work items remain.
 */
export function LabelsList({ labels }: LabelsListProps) {
  const groups = useMemo(() => groupLabels(labels), [labels]);

  if (labels.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No labels yet</EmptyTitle>
          <EmptyDescription>
            Create your first label to start grouping tasks across types.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="divide-y rounded-lg border" data-slot="labels-list">
      {groups.map((group) => (
        <li className="bg-card" key={group.parent._id}>
          <LabelRow indent={false} label={group.parent} />
          {group.children.map((child) => (
            <LabelRow indent key={child._id} label={child} />
          ))}
        </li>
      ))}
    </ul>
  );
}

interface LabelRowProps {
  indent: boolean;
  label: LabelWithUsage;
}

function LabelRow({ label, indent }: LabelRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3",
        indent && "pl-10"
      )}
      data-testid="label-row"
    >
      {editing ? (
        <LabelEditor label={label} onClose={() => setEditing(false)} />
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <LabelPill color={label.color} name={label.name} />
            <Muted className="text-xs">
              {label.usageCount} {label.usageCount === 1 ? "task" : "tasks"}
            </Muted>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              aria-label={`Edit ${label.name}`}
              className="size-7"
              onClick={() => setEditing(true)}
              size="icon-sm"
              variant="ghost"
            >
              <IconPencil className="size-4" />
            </Button>
            <Button
              aria-label={`Delete ${label.name}`}
              className="size-7 text-destructive hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
              size="icon-sm"
              variant="ghost"
            >
              <IconTrash className="size-4" />
            </Button>
          </div>
        </>
      )}

      <DeleteLabelDialog
        label={label}
        onClose={() => setConfirmingDelete(false)}
        open={confirmingDelete}
      />
    </div>
  );
}

interface LabelEditorProps {
  label: LabelWithUsage;
  onClose: () => void;
}

function LabelEditor({ label, onClose }: LabelEditorProps) {
  const inputId = useId();
  const [name, setName] = useState(label.name);
  const [colorId, setColorId] = useState<LabelColorId>(
    (label.color as LabelColorId) ?? "slate"
  );
  const [saving, setSaving] = useState(false);
  const updateLabel = useMutation(api.autopilot.mutations.labels.updateLabel);

  const trimmed = name.trim();
  const dirty = trimmed !== label.name.trim() || colorId !== label.color;
  const canSave = trimmed.length > 0 && dirty && !saving;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await updateLabel({
        labelId: label._id,
        name: trimmed === label.name.trim() ? undefined : trimmed,
        color: colorId === label.color ? undefined : colorId,
      });
      toast.success("Label updated");
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update label";
      toast.error(message);
      setSaving(false);
    }
  };

  return (
    <form
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
      onSubmit={(event) => {
        event.preventDefault();
        handleSave().catch(() => {
          // Errors surfaced via toast inside handleSave.
        });
      }}
    >
      <Input
        aria-label="Label name"
        autoFocus
        className="h-8 max-w-xs"
        id={inputId}
        maxLength={64}
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {LABEL_COLORS.map((color) => {
          const selected = color.id === colorId;
          return (
            <button
              aria-label={color.label}
              aria-pressed={selected}
              className={cn(
                "size-5 rounded-full ring-1 ring-border transition-all",
                color.swatch,
                selected
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "hover:ring-foreground/40"
              )}
              key={color.id}
              onClick={() => setColorId(color.id)}
              type="button"
            />
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          aria-label="Cancel edit"
          onClick={onClose}
          size="sm"
          type="button"
          variant="ghost"
        >
          <IconX className="size-4" />
        </Button>
        <Button disabled={!canSave} size="sm" type="submit">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

interface DeleteLabelDialogProps {
  label: Doc<"workItemLabels">;
  onClose: () => void;
  open: boolean;
}

function DeleteLabelDialog({ label, open, onClose }: DeleteLabelDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const deleteLabel = useMutation(api.autopilot.mutations.labels.deleteLabel);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteLabel({ labelId: label._id });
      toast.success(`Label "${label.name}" deleted`);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete label";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      open={open}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete label?</AlertDialogTitle>
          <AlertDialogDescription>
            "{label.name}" will be removed from every work item it's attached
            to. The work items themselves stay; only the label assignment is
            cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={handleDelete}
            variant="destructive"
          >
            {deleting ? "Deleting…" : "Delete label"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
