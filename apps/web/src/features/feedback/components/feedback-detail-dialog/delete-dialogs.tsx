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

interface DeleteFeedbackDialogProps {
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function DeleteFeedbackDialog({
  open,
  onOpenChange,
  onDelete,
}: DeleteFeedbackDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete feedback</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this feedback? This action cannot be
            undone and will remove all associated comments and votes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="surface">
            Cancel
          </Button>
          <Button onClick={onDelete} tone="danger" variant="surface">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteCommentDialogProps {
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function DeleteCommentDialog({
  open,
  onOpenChange,
  onDelete,
}: DeleteCommentDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete comment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this comment? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="surface">
            Cancel
          </Button>
          <Button onClick={onDelete} tone="danger" variant="surface">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
