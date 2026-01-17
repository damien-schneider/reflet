"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteReleaseDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
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
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="destructive">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
