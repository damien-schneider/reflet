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

interface ApiKeyDialogsProps {
  isRegenerating: boolean;
  onDelete: () => void;
  onRegenerate: () => void;
  setShowDeleteDialog: (value: boolean) => void;
  setShowRegenerateDialog: (value: boolean) => void;
  showDeleteDialog: boolean;
  showRegenerateDialog: boolean;
}

export function ApiKeyDialogs({
  showRegenerateDialog,
  setShowRegenerateDialog,
  isRegenerating,
  onRegenerate,
  showDeleteDialog,
  setShowDeleteDialog,
  onDelete,
}: ApiKeyDialogsProps) {
  return (
    <>
      <AlertDialog
        onOpenChange={setShowRegenerateDialog}
        open={showRegenerateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Secret Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate your current secret key. Any server-side
              integrations using the old key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose
              disabled={isRegenerating}
              onClick={onRegenerate}
              tone="primary"
              variant="solid"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any applications using this API key
              will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose
              onClick={onDelete}
              tone="danger"
              variant="surface"
            >
              Delete
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
