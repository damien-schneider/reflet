"use client";

import { Warning } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTagDotColor } from "@/lib/tag-colors";

interface ColumnDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusToDelete: {
    id: Id<"organizationStatuses">;
    name: string;
    color: string;
  } | null;
  otherStatuses: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
  feedbackCount: number;
}

export function ColumnDeleteDialog({
  open,
  onOpenChange,
  statusToDelete,
  otherStatuses,
  feedbackCount,
}: ColumnDeleteDialogProps) {
  const [moveToStatusId, setMoveToStatusId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const removeStatus = useMutation(api.organization_statuses.remove);

  const handleDelete = async () => {
    if (!(statusToDelete && moveToStatusId)) {
      return;
    }

    setIsDeleting(true);
    try {
      await removeStatus({
        id: statusToDelete.id,
        moveToStatusId: moveToStatusId as Id<"organizationStatuses">,
      });
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
      setMoveToStatusId("");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMoveToStatusId("");
    }
    onOpenChange(newOpen);
  };

  if (!statusToDelete) {
    return null;
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warning className="h-5 w-5 text-destructive" />
            Delete Column
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the &quot;{statusToDelete.name}
            &quot; column?
            {feedbackCount > 0 && (
              <span className="mt-2 block font-medium text-foreground">
                {feedbackCount} feedback item{feedbackCount !== 1 ? "s" : ""}{" "}
                will be moved to the selected column.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {otherStatuses.length > 0 && feedbackCount > 0 && (
          <div className="py-4">
            <span className="mb-2 block font-medium text-sm">
              Move feedback to:
            </span>
            <Select
              onValueChange={(value) =>
                setMoveToStatusId((value as string | null) || "")
              }
              value={moveToStatusId || null}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a column..." />
              </SelectTrigger>
              <SelectContent>
                {otherStatuses.map((status) => (
                  <SelectItem key={status._id} value={status._id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: getTagDotColor(status.color),
                        }}
                      />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {otherStatuses.length === 0 && (
          <p className="py-4 text-muted-foreground text-sm">
            This is the only column. You cannot delete it.
          </p>
        )}

        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={
              isDeleting ||
              otherStatuses.length === 0 ||
              (feedbackCount > 0 && !moveToStatusId)
            }
            onClick={handleDelete}
            variant="destructive"
          >
            {isDeleting ? "Deleting..." : "Delete Column"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
