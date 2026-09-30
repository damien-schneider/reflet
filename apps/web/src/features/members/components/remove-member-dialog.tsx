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
import { toast } from "@ctrl-ui/react/ui/toast";
import { useState } from "react";

interface RemoveMemberDialogProps {
  member: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function RemoveMemberDialog({
  member,
  onClose,
  onConfirm,
}: RemoveMemberDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleConfirm = async () => {
    setIsRemoving(true);
    try {
      await onConfirm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t remove the member"
      );
    }
    setIsRemoving(false);
  };

  return (
    <Dialog onOpenChange={() => onClose()} open={!!member}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove member</DialogTitle>
          <DialogDescription>
            Remove <strong>{member?.name}</strong> from this organization? They
            lose access to its boards and data right away.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="surface">
            Cancel
          </Button>
          <Button
            disabled={isRemoving}
            onClick={handleConfirm}
            tone="danger"
            variant="solid"
          >
            {isRemoving ? (
              <Spinner aria-hidden data-icon="inline-start" size="xs" />
            ) : null}
            {isRemoving ? "Removing…" : "Remove member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
