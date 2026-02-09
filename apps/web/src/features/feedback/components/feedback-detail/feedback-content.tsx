"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";

interface FeedbackContentProps {
  feedbackId: Id<"feedback">;
  title: string;
  description: string;
  isAdmin: boolean;
  attachments?: string[];
}

function AttachmentThumbnail({ src, alt }: { src: string; alt: string }) {
  return (
    <Image alt={alt} className="object-cover" fill sizes="80px" src={src} />
  );
}

export function FeedbackContent({
  feedbackId,
  title,
  description,
  isAdmin,
  attachments = [],
}: FeedbackContentProps) {
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
        className="font-semibold text-xl leading-tight"
        disabled={!isAdmin}
        onChange={handleTitleChange}
        placeholder="Untitled"
        value={editedTitle}
      />

      {/* Description */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <TiptapMarkdownEditor
          className="min-h-[60px]"
          editable={isAdmin}
          minimal
          onChange={handleDescriptionChange}
          placeholder={
            isAdmin ? "Add a description..." : "No description provided."
          }
          value={editedDescription}
        />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((url, index) => (
            <a
              className="relative block h-20 w-20 overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-80"
              href={url}
              key={url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <AttachmentThumbnail alt={`Attachment ${index + 1}`} src={url} />
            </a>
          ))}
        </div>
      )}

      {/* Save/Cancel buttons */}
      {hasUnsavedChanges && isAdmin && (
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} size="sm">
            Save changes
          </Button>
          <Button onClick={handleCancel} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
