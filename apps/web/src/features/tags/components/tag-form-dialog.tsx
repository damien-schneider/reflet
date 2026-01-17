"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TAG_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
];

interface TagFormDialogProps {
  organizationId: Id<"organizations">;
  editingTag: {
    _id: string;
    name: string;
    color: string;
    isDoneStatus: boolean;
    isRoadmapLane: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TagFormDialog({
  organizationId,
  editingTag,
  open,
  onOpenChange,
  onSuccess,
}: TagFormDialogProps) {
  const createTag = useMutation(api.tag_manager_actions.create);
  const updateTag = useMutation(api.tag_manager_actions.update);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
    isDoneStatus: false,
    isRoadmapLane: false,
  });

  useEffect(() => {
    if (editingTag) {
      setFormData({
        name: editingTag.name,
        color: editingTag.color,
        isDoneStatus: editingTag.isDoneStatus,
        isRoadmapLane: editingTag.isRoadmapLane,
      });
    } else {
      setFormData({
        name: "",
        color: "#3b82f6",
        isDoneStatus: false,
        isRoadmapLane: false,
      });
    }
  }, [editingTag]);

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
        isDoneStatus: formData.isDoneStatus,
        isRoadmapLane: formData.isRoadmapLane,
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to create tag:", error);
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
        id: editingTag._id as Id<"tags">,
        name: formData.name.trim(),
        color: formData.color,
        isDoneStatus: formData.isDoneStatus,
        isRoadmapLane: formData.isRoadmapLane,
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to update tag:", error);
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
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Bug, Feature, Enhancement..."
              value={formData.name}
            />
          </div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((color) => (
                <button
                  className={`h-8 w-8 rounded-full border-2 ${
                    formData.color === color.value
                      ? "border-foreground"
                      : "border-transparent"
                  }`}
                  key={color.value}
                  onClick={() =>
                    setFormData({ ...formData, color: color.value })
                  }
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  type="button"
                />
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.isRoadmapLane}
              id="isRoadmapLane"
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  isRoadmapLane: checked as boolean,
                })
              }
            />
            <Label htmlFor="isRoadmapLane">
              Use as roadmap lane (appears as a column in roadmap view)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.isDoneStatus}
              id="isDoneStatus"
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isDoneStatus: checked as boolean })
              }
            />
            <Label htmlFor="isDoneStatus">
              Mark as done status (items will be eligible for changelog)
            </Label>
          </div>
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
