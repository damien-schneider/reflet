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
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

interface DeleteTagDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tag: { _id: Id<"tags">; name: string } | null;
}

export function DeleteTagDialog({
  tag,
  onOpenChange,
  onSuccess,
}: DeleteTagDialogProps) {
  const deleteTag = useMutation(api.organizations.tag_manager_actions.remove);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (isDeleting) {
      return;
    }
    setError(null);
    onOpenChange(open);
  };

  const handleDelete = async () => {
    if (!tag) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await deleteTag({ id: tag._id });
      onSuccess();
    } catch {
      setError("Couldn’t delete the tag. Check your connection and try again.");
    }
    setIsDeleting(false);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={tag !== null}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{tag?.name}”?</DialogTitle>
          <DialogDescription>
            The tag will be removed from every feedback item that uses it. You
            can’t undo this.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-destructive-text text-sm" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={isDeleting}
            onClick={() => handleOpenChange(false)}
            variant="surface"
          >
            Cancel
          </Button>
          <Button
            disabled={isDeleting}
            onClick={handleDelete}
            tone="danger"
            variant="surface"
          >
            {isDeleting && <Spinner data-icon="inline-start" size="xs" />}
            Delete tag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
