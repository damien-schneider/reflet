"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import {
  isValidTagColor,
  migrateHexToNamedColor,
  type TagColor,
} from "@/lib/tag-colors";

interface TagFormDialogProps {
  editingTag: {
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
  } | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  organizationId: Id<"organizations">;
}

export function TagFormDialog({ editingTag, ...props }: TagFormDialogProps) {
  return (
    <TagFormDialogContent
      editingTag={editingTag}
      key={getTagFormKey(editingTag)}
      {...props}
    />
  );
}

type EditableTag = NonNullable<TagFormDialogProps["editingTag"]>;

interface TagFormData {
  color: TagColor;
  icon?: string;
  name: string;
}

const getTagFormData = (editingTag: EditableTag | null): TagFormData => {
  if (!editingTag) {
    return {
      name: "",
      color: "blue",
      icon: undefined,
    };
  }

  const color = isValidTagColor(editingTag.color)
    ? editingTag.color
    : migrateHexToNamedColor(editingTag.color);

  return {
    name: editingTag.name,
    color,
    icon: editingTag.icon,
  };
};

const getTagFormKey = (editingTag: EditableTag | null): string => {
  if (!editingTag) {
    return "create";
  }
  return `${editingTag._id}:${editingTag.name}:${editingTag.color}:${editingTag.icon ?? ""}`;
};

function TagFormDialogContent({
  organizationId,
  editingTag,
  open,
  onOpenChange,
  onSuccess,
}: TagFormDialogProps) {
  const createTag = useMutation(api.organizations.tag_manager_actions.create);
  const updateTag = useMutation(api.organizations.tag_manager_actions.update);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TagFormData>(() =>
    getTagFormData(editingTag)
  );

  const handleCreateTag = async () => {
    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createTag({
        organizationId,
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTag({
        id: editingTag._id,
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  let buttonLabel = "Create";
  if (isSubmitting) {
    buttonLabel = "Saving...";
  } else if (editingTag) {
    buttonLabel = "Save";
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTag ? "Edit tag" : "Create tag"}</DialogTitle>
          <DialogDescription>
            {editingTag
              ? "Update the tag details."
              : "Create a new tag to categorize feedback."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-3">
            <EmojiPicker
              onChange={(icon) =>
                setFormData((current) => ({ ...current, icon }))
              }
              value={formData.icon}
            />
            <div className="flex-1">
              <Label className="sr-only" htmlFor="name">
                Name
              </Label>
              <Input
                id="name"
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    name: e.target.value,
                  }))
                }
                placeholder="Tag name..."
                value={formData.name}
              />
            </div>
          </div>
          <NotionColorPicker
            onChange={(color) =>
              setFormData((current) => ({ ...current, color }))
            }
            value={formData.color}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={editingTag ? handleUpdateTag : handleCreateTag}
          >
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
