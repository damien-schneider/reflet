"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";

interface FeedbackContentProps {
  attachments?: string[];
  description: string;
  feedbackId: Id<"feedback">;
  isAdmin: boolean;
  title: string;
}

interface FeedbackDraft {
  baselineDescription: string;
  baselineTitle: string;
  description: string;
  title: string;
}

const EMPTY_ATTACHMENTS: string[] = [];

function createFeedbackDraft(
  title: string,
  description: string
): FeedbackDraft {
  return {
    baselineDescription: description,
    baselineTitle: title,
    description,
    title,
  };
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
  attachments = EMPTY_ATTACHMENTS,
}: FeedbackContentProps) {
  return (
    <FeedbackContentEditor
      attachments={attachments}
      description={description}
      feedbackId={feedbackId}
      isAdmin={isAdmin}
      key={`${feedbackId}:${title}:${description}`}
      title={title}
    />
  );
}

function FeedbackContentEditor({
  feedbackId,
  title,
  description,
  isAdmin,
  attachments,
}: Required<FeedbackContentProps>) {
  const updateFeedback = useMutation(api.feedback.mutations.update);
  const [draft, setDraft] = useState(() =>
    createFeedbackDraft(title, description)
  );

  const hasUnsavedChanges =
    draft.title !== draft.baselineTitle ||
    draft.description !== draft.baselineDescription;

  const handleTitleChange = (newTitle: string) => {
    setDraft((current) => ({ ...current, title: newTitle }));
  };

  const handleDescriptionChange = (newDescription: string) => {
    setDraft((current) => ({ ...current, description: newDescription }));
  };

  const handleSave = async () => {
    const updates: { title?: string; description?: string } = {};
    const savedTitle = draft.title.trim();
    if (savedTitle !== draft.baselineTitle) {
      updates.title = savedTitle;
    }
    if (draft.description !== draft.baselineDescription) {
      updates.description = draft.description;
    }
    if (Object.keys(updates).length > 0) {
      await updateFeedback({ id: feedbackId, ...updates });
    }
    setDraft((current) => ({
      baselineDescription: current.description,
      baselineTitle: savedTitle,
      description: current.description,
      title: savedTitle,
    }));
  };

  const handleCancel = () => {
    setDraft((current) => ({
      ...current,
      description: current.baselineDescription,
      title: current.baselineTitle,
    }));
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <TiptapTitleEditor
        className="font-semibold text-xl leading-tight"
        disabled={!isAdmin}
        onChange={handleTitleChange}
        placeholder="Untitled"
        value={draft.title}
      />

      {/* Description */}
      <div className="markdown-content max-w-none">
        <TiptapMarkdownEditor
          className="min-h-[60px]"
          editable={isAdmin}
          minimal
          onChange={handleDescriptionChange}
          placeholder={
            isAdmin ? "Add a description..." : "No description provided."
          }
          value={draft.description}
        />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((url, index) => (
            <a
              className="relative block size-20 overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-80"
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
