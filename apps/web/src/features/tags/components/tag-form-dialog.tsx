"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import { type EditableTag, TagForm } from "./tag-form";

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
          editingTag={editingTag}
          key={editingTag?._id ?? "new"}
          layout="dialog"
          onCancel={() => onOpenChange(false)}
          onSuccess={onSuccess}
          organizationId={organizationId}
        />
      </DialogContent>
    </Dialog>
  );
}
