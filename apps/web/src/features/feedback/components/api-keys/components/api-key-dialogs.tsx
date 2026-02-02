"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApiKeyDialogsProps {
  showRegenerateDialog: boolean;
  setShowRegenerateDialog: (value: boolean) => void;
  isRegenerating: boolean;
  onRegenerate: () => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (value: boolean) => void;
  onDelete: () => void;
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isRegenerating} onClick={onRegenerate}>
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </AlertDialogAction>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
