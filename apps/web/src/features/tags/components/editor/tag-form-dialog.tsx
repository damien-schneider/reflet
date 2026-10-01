"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import type { EditableTag } from "@/features/tags/components/editor/form-state";
import { TagForm } from "@/features/tags/components/editor/tag-form";

interface TagFormDialogProps {
  editingTag: EditableTag | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  organizationId: Id<"organizations">;
}

export function TagFormDialog({
  organizationId,
  editingTag,
  open,
  onOpenChange,
  onSuccess,
}: TagFormDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTag ? "Edit tag" : "Create tag"}</DialogTitle>
          <DialogDescription>
            {editingTag
              ? "Changes apply everywhere this tag is used."
              : "Tags group related feedback so you can filter it."}
          </DialogDescription>
        </DialogHeader>
        <TagForm
          actions={{ onCancel: () => onOpenChange(false), onSuccess }}
          key={editingTag?._id ?? "new"}
          layout="dialog"
          target={{ editingTag, organizationId }}
        />
      </DialogContent>
    </Dialog>
  );
}
