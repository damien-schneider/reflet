"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ctrl-ui/react/ui/alert-dialog";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { toId } from "@/lib/convex-helpers";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface ColumnDeleteDialogProps {
  feedbackCount: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  otherStatuses: Array<{
    _id: Id<"organizationStatuses">;
    name: string;
    color: string;
  }>;
  statusToDelete: {
    id: Id<"organizationStatuses">;
    name: string;
    color: string;
  } | null;
}

export function ColumnDeleteDialog({
  open,
  onOpenChange,
  statusToDelete,
  otherStatuses,
  feedbackCount,
}: ColumnDeleteDialogProps) {
  const [moveToStatusId, setMoveToStatusId] =
    useState<Id<"organizationStatuses"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const removeStatus = useMutation(api.organizations.status_mutations.remove);

  const hasFeedback = feedbackCount > 0;
  const targetStatusId = hasFeedback
    ? moveToStatusId
    : (otherStatuses[0]?._id ?? null);
  const isOnlyColumn = otherStatuses.length === 0;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMoveToStatusId(null);
    }
    onOpenChange(newOpen);
  };

  const handleDelete = async () => {
    if (!(statusToDelete && targetStatusId)) {
      return;
    }
    setIsDeleting(true);
    try {
      await removeStatus({
        id: statusToDelete.id,
        moveToStatusId: targetStatusId,
      });
      handleOpenChange(false);
    } catch {
      toast.error(`Couldn’t delete “${statusToDelete.name}”. Try again.`);
    }
    setIsDeleting(false);
  };

  if (!statusToDelete) {
    return null;
  }

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete the “{statusToDelete.name}” column?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <ColumnDeleteDescription
              feedbackCount={feedbackCount}
              isOnlyColumn={isOnlyColumn}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!isOnlyColumn && hasFeedback && (
          <MoveToColumnSelect
            onChange={setMoveToStatusId}
            otherStatuses={otherStatuses}
            value={moveToStatusId}
          />
        )}

        <AlertDialogFooter>
          <AlertDialogClose>Cancel</AlertDialogClose>
          {!isOnlyColumn && (
            <Button
              disabled={isDeleting || !targetStatusId}
              onClick={handleDelete}
              tone="danger"
              variant="surface"
            >
              {isDeleting ? "Deleting…" : "Delete column"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ColumnDeleteDescription({
  feedbackCount,
  isOnlyColumn,
}: {
  feedbackCount: number;
  isOnlyColumn: boolean;
}) {
  if (isOnlyColumn) {
    return "This is your only column, so it can’t be deleted.";
  }
  if (feedbackCount > 0) {
    return `Its ${feedbackCount} feedback ${feedbackCount === 1 ? "item" : "items"} will move to the column you pick.`;
  }
  return "The column is empty.";
}

function MoveToColumnSelect({
  otherStatuses,
  value,
  onChange,
}: {
  onChange: (id: Id<"organizationStatuses">) => void;
  otherStatuses: ColumnDeleteDialogProps["otherStatuses"];
  value: Id<"organizationStatuses"> | null;
}) {
  const selectId = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={selectId}>Move feedback to</Label>
      <Select
        onValueChange={(next) => onChange(toId("organizationStatuses", next))}
        value={value ?? undefined}
      >
        <SelectTrigger className="w-full" id={selectId}>
          <SelectValue placeholder="Choose a column" />
        </SelectTrigger>
        <SelectContent>
          {otherStatuses.map((status) => (
            <SelectItem key={status._id} value={status._id}>
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  getTagSwatchClass(status.color)
                )}
              />
              {status.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
