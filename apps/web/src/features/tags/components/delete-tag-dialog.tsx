"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";

interface DeleteTagDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tagId: Id<"tags"> | null;
}

export function DeleteTagDialog({
  tagId,
  onOpenChange,
  onSuccess,
}: DeleteTagDialogProps) {
  const deleteTag = useMutation(api.organizations.tag_manager_actions.remove);

  const handleDeleteTag = async () => {
    if (!tagId) {
      return;
    }

    try {
      await deleteTag({ id: tagId });
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
          <Button onClick={() => onOpenChange(false)} variant="surface">
            Cancel
          </Button>
          <Button onClick={handleDeleteTag} tone="danger" variant="surface">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
