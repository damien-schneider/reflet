"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ctrl-ui/react/ui/alert-dialog";
import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import { useState } from "react";

interface DeleteReleaseDialogProps {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  open: boolean;
  releaseTitle?: string;
}

export function DeleteReleaseDialog({
  open,
  onClose,
  onConfirm,
  releaseTitle,
}: DeleteReleaseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete the release. Try again."
      );
    }
    setIsDeleting(false);
  };

  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (!(nextOpen || isDeleting)) {
          onClose();
        }
      }}
      open={open}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-balance">
            Delete {releaseTitle ? `“${releaseTitle}”` : "this release"}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            The release disappears from your changelog and linked feedback is
            unlinked. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button disabled={isDeleting} onClick={onClose} variant="surface">
            Cancel
          </Button>
          <Button
            disabled={isDeleting}
            onClick={handleConfirm}
            tone="danger"
            variant="surface"
          >
            {isDeleting ? <Spinner data-icon="inline-start" size="xs" /> : null}
            Delete release
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
