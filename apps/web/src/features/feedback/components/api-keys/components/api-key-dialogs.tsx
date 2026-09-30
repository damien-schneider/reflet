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
import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import { useState } from "react";
import type { ApiKeyListItem } from "../hooks/use-api-keys";

export type ApiKeyAction = "delete" | "regenerate";

const ACTION_COPY = {
  delete: {
    confirm: "Delete key",
    description:
      "Apps using this key stop working right away. This can’t be undone.",
    error: "Couldn’t delete the key. Try again.",
    pending: "Deleting…",
    title: "Delete",
  },
  regenerate: {
    confirm: "Regenerate key",
    description:
      "The current secret key stops working right away. Update your server-side integrations with the new one.",
    error: "Couldn’t regenerate the key. Try again.",
    pending: "Regenerating…",
    title: "Regenerate secret for",
  },
} as const;

interface ApiKeyConfirmDialogProps {
  onClose: () => void;
  onConfirm: (action: ApiKeyAction, apiKey: ApiKeyListItem) => Promise<boolean>;
  pending: { action: ApiKeyAction; apiKey: ApiKeyListItem } | null;
}

export function ApiKeyConfirmDialog({
  onClose,
  onConfirm,
  pending,
}: ApiKeyConfirmDialogProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [shown, setShown] = useState(pending);
  if (pending && pending !== shown) {
    setShown(pending);
  }
  const copy = shown ? ACTION_COPY[shown.action] : null;

  const handleConfirm = async () => {
    if (!pending) {
      return;
    }
    setIsWorking(true);
    let done = false;
    try {
      done = await onConfirm(pending.action, pending.apiKey);
    } catch {
      toast.error(ACTION_COPY[pending.action].error);
    }
    setIsWorking(false);
    if (done) {
      onClose();
    }
  };

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!(open || isWorking)) {
          onClose();
        }
      }}
      open={pending !== null}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {copy?.title} “{shown?.apiKey.name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose disabled={isWorking} variant="surface">
            Cancel
          </AlertDialogClose>
          <Button
            disabled={isWorking}
            onClick={handleConfirm}
            tone="danger"
            variant="solid"
          >
            {isWorking ? (
              <Spinner aria-hidden data-icon="inline-start" size="xs" />
            ) : null}
            {isWorking ? copy?.pending : copy?.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
