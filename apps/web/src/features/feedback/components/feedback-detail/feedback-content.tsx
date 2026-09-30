"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import Image from "next/image";
import { useState } from "react";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";

interface FeedbackContentProps {
  attachments?: string[];
  description: string;
  feedbackId: Id<"feedback">;
  isAdmin: boolean;
  title: string;
}

function AttachmentThumbnail({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      alt={alt}
      className="object-cover outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
      fill
      sizes="80px"
      src={src}
    />
  );
}

export function FeedbackContent({
  feedbackId,
  title,
  description,
  isAdmin,
  attachments = [],
}: FeedbackContentProps) {
  const updateFeedback = useMutation(api.feedback.mutations.update);

  const [editedTitle, setEditedTitle] = useState(title);
  const [editedDescription, setEditedDescription] = useState(description);
  const [syncedProps, setSyncedProps] = useState({ description, title });

  if (syncedProps.title !== title || syncedProps.description !== description) {
    setSyncedProps({ description, title });
    setEditedTitle(title);
    setEditedDescription(description);
  }

  const hasUnsavedChanges =
    editedTitle !== title || editedDescription !== description;

  const handleSave = async () => {
    const trimmedTitle = editedTitle.trim();
    const updates: { title?: string; description?: string } = {};
    if (trimmedTitle !== title) {
      updates.title = trimmedTitle;
    }
    if (editedDescription !== description) {
      updates.description = editedDescription;
    }
    if (Object.keys(updates).length > 0) {
      await updateFeedback({ id: feedbackId, ...updates });
    }
    setEditedTitle(trimmedTitle);
  };

  const handleCancel = () => {
    setEditedTitle(title);
    setEditedDescription(description);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <TiptapTitleEditor
        className="font-semibold text-xl leading-tight"
        disabled={!isAdmin}
        onChange={setEditedTitle}
        placeholder="Untitled"
        value={editedTitle}
      />

      {/* Description */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <TiptapMarkdownEditor
          className="min-h-[60px]"
          editable={isAdmin}
          minimal
          onChange={setEditedDescription}
          placeholder={
            isAdmin ? "Add a description…" : "No description provided."
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
          <Button onClick={handleSave} size="xs" tone="primary" variant="solid">
            Save changes
          </Button>
          <Button onClick={handleCancel} size="xs" variant="ghost">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
