import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";

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
  return (
    <Dialog onOpenChange={() => onClose()} open={!!member}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{member?.name}</strong> from
            this organization? They will lose access to all boards and data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="surface">
            Cancel
          </Button>
          <Button onClick={onConfirm} tone="danger" variant="surface">
            Remove member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
