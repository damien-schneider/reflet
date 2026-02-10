"use client";

import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useCallback, useEffect, useState } from "react";

interface FeedbackData {
  title: string;
  description?: string | null;
}

interface UpdateFeedbackArgs {
  id: Id<"feedback">;
  title?: string;
  description?: string;
}

interface UseFeedbackEditingParams {
  feedbackId: Id<"feedback"> | null;
  feedback: FeedbackData | null | undefined;
  updateFeedback: (args: UpdateFeedbackArgs) => Promise<unknown>;
}

export function useFeedbackEditing({
  feedbackId,
  feedback,
  updateFeedback,
}: UseFeedbackEditingParams) {
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync local state when feedback loads or changes
  useEffect(() => {
    if (feedback) {
      setEditedTitle(feedback.title);
      setEditedDescription(feedback.description ?? "");
      setHasUnsavedChanges(false);
    }
  }, [feedback]);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setEditedTitle(newTitle);
      setHasUnsavedChanges(
        newTitle !== feedback?.title ||
          editedDescription !== (feedback?.description ?? "")
      );
    },
    [feedback?.title, feedback?.description, editedDescription]
  );

  const handleDescriptionChange = useCallback(
    (newDescription: string) => {
      setEditedDescription(newDescription);
      setHasUnsavedChanges(
        editedTitle !== feedback?.title ||
          newDescription !== (feedback?.description ?? "")
      );
    },
    [feedback?.title, feedback?.description, editedTitle]
  );

  const handleSaveChanges = useCallback(async () => {
    if (!feedbackId) {
      return;
    }
    const updates: { title?: string; description?: string } = {};
    if (editedTitle.trim() !== feedback?.title) {
      updates.title = editedTitle.trim();
    }
    if (editedDescription !== (feedback?.description ?? "")) {
      updates.description = editedDescription;
    }
    if (Object.keys(updates).length > 0) {
      await updateFeedback({ id: feedbackId, ...updates });
    }
    setHasUnsavedChanges(false);
  }, [feedbackId, editedTitle, editedDescription, feedback, updateFeedback]);

  const handleCancelChanges = useCallback(() => {
    if (feedback) {
      setEditedTitle(feedback.title);
      setEditedDescription(feedback.description ?? "");
      setHasUnsavedChanges(false);
    }
  }, [feedback]);

  return {
    editedTitle,
    editedDescription,
    hasUnsavedChanges,
    handleTitleChange,
    handleDescriptionChange,
    handleSaveChanges,
    handleCancelChanges,
  } as const;
}
