"use client";

import { Tag } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";

interface FeedbackHeaderProps {
  feedbackId: Id<"feedback">;
  title: string;
  description: string;
  tags?: Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
  } | null>;
  isAdmin: boolean;
}

export function FeedbackHeader({
  feedbackId,
  title,
  description,
  tags = [],
  isAdmin,
}: FeedbackHeaderProps) {
  const updateFeedback = useMutation(api.feedback.update);

  // Local state for unsaved changes
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedDescription, setEditedDescription] = useState(description);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync local state when props change
  useEffect(() => {
    setEditedTitle(title);
    setEditedDescription(description);
    setHasUnsavedChanges(false);
  }, [title, description]);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setEditedTitle(newTitle);
      setHasUnsavedChanges(
        newTitle !== title || editedDescription !== description
      );
    },
    [title, description, editedDescription]
  );

  const handleDescriptionChange = useCallback(
    (newDescription: string) => {
      setEditedDescription(newDescription);
      setHasUnsavedChanges(
        editedTitle !== title || newDescription !== description
      );
    },
    [title, description, editedTitle]
  );

  const handleSave = useCallback(async () => {
    const updates: { title?: string; description?: string } = {};
    if (editedTitle.trim() !== title) {
      updates.title = editedTitle.trim();
    }
    if (editedDescription !== description) {
      updates.description = editedDescription;
    }
    if (Object.keys(updates).length > 0) {
      await updateFeedback({ id: feedbackId, ...updates });
    }
    setHasUnsavedChanges(false);
  }, [
    feedbackId,
    editedTitle,
    editedDescription,
    title,
    description,
    updateFeedback,
  ]);

  const handleCancel = useCallback(() => {
    setEditedTitle(title);
    setEditedDescription(description);
    setHasUnsavedChanges(false);
  }, [title, description]);

  return (
    <div className="space-y-4">
      {/* Title */}
      <TiptapTitleEditor
        className="font-semibold text-xl"
        disabled={!isAdmin}
        onChange={handleTitleChange}
        placeholder="Untitled"
        value={editedTitle}
      />

      {/* Tags */}
      {tags.length > 0 && <TagsList tags={tags} />}

      {/* Description */}
      <TiptapMarkdownEditor
        editable={isAdmin}
        minimal
        onChange={handleDescriptionChange}
        placeholder={isAdmin ? "Add a description..." : ""}
        value={editedDescription}
      />

      {/* Save/Cancel buttons */}
      {hasUnsavedChanges && isAdmin && (
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} size="sm">
            Save
          </Button>
          <Button onClick={handleCancel} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

interface TagsListProps {
  tags: Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
  } | null>;
}

function TagsList({ tags }: TagsListProps) {
  const validTags = tags.filter(Boolean) as Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
  }>;

  if (validTags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag className="h-4 w-4 text-muted-foreground" />
      {validTags.map((tag) => (
        <Badge className="font-normal" color={tag.color} key={tag._id}>
          {tag.icon && <span>{tag.icon}</span>}
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
