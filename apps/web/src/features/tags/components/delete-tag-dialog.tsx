"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteTagDialogProps {
  tagId: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteTagDialog({
  tagId,
  onOpenChange,
  onSuccess,
}: DeleteTagDialogProps) {
  const deleteTag = useMutation(api.tag_manager_actions.remove);

  const handleDeleteTag = async () => {
    if (!tagId) {
      return;
    }

    try {
      await deleteTag({ id: tagId as Id<"tags"> });
      onSuccess();
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={!!tagId}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete tag</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this tag? It will be removed from
            all feedback items. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleDeleteTag} variant="destructive">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
