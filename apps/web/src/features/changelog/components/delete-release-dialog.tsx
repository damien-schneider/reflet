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

interface DeleteReleaseDialogProps {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  open: boolean;
}

export function DeleteReleaseDialog({
  open,
  onClose,
  onConfirm,
}: DeleteReleaseDialogProps) {
  return (
    <Dialog onOpenChange={(val) => !val && onClose()} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete release</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this release? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="surface">
            Cancel
          </Button>
          <Button onClick={onConfirm} tone="danger" variant="surface">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
