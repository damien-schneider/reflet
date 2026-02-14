"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";

interface NewFeedbackState {
  title: string;
  description: string;
  email: string;
  attachments: string[];
}

const INITIAL_FEEDBACK: NewFeedbackState = {
  title: "",
  description: "",
  email: "",
  attachments: [],
};

const MAX_TITLE_LENGTH = 100;

interface UseSubmitFeedbackParams {
  organizationId: Id<"organizations">;
  isMember: boolean;
  createFeedbackPublic: (args: {
    organizationId: Id<"organizations">;
    title: string;
    description?: string;
    email?: string;
    attachments?: string[];
  }) => Promise<unknown>;
  createFeedbackMember: (args: {
    organizationId: Id<"organizations">;
    title: string;
    description: string;
    attachments?: string[];
    tagId?: Id<"tags">;
  }) => Promise<Id<"feedback">>;
  assignFeedback: (args: {
    feedbackId: Id<"feedback">;
    assigneeId: string;
  }) => Promise<unknown>;
  closeSubmitDrawer: () => void;
}

export function useSubmitFeedback({
  organizationId,
  isMember,
  createFeedbackPublic,
  createFeedbackMember,
  assignFeedback,
  closeSubmitDrawer,
}: UseSubmitFeedbackParams) {
  const [newFeedback, setNewFeedback] =
    useState<NewFeedbackState>(INITIAL_FEEDBACK);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitTagId, setSubmitTagId] = useState<Id<"tags"> | undefined>();
  const [submitAssigneeId, setSubmitAssigneeId] = useState<
    string | undefined
  >();

  const handleSubmitFeedback = async () => {
    const trimmedTitle = newFeedback.title.trim();
    if (!trimmedTitle || trimmedTitle.length > MAX_TITLE_LENGTH) {
      return;
    }

    setIsSubmitting(true);
    try {
      const attachments =
        newFeedback.attachments.length > 0
          ? newFeedback.attachments
          : undefined;
      let createdFeedbackId: Id<"feedback"> | undefined;
      if (isMember) {
        createdFeedbackId = await createFeedbackMember({
          organizationId,
          title: trimmedTitle,
          description: newFeedback.description.trim() || "",
          attachments,
          tagId: submitTagId,
        });
      } else {
        await createFeedbackPublic({
          organizationId,
          title: trimmedTitle,
          description: newFeedback.description.trim() || undefined,
          email: newFeedback.email.trim() || undefined,
          attachments,
        });
      }
      if (createdFeedbackId && submitAssigneeId) {
        await assignFeedback({
          feedbackId: createdFeedbackId,
          assigneeId: submitAssigneeId,
        });
      }
      closeSubmitDrawer();
      setNewFeedback(INITIAL_FEEDBACK);
      setSubmitTagId(undefined);
      setSubmitAssigneeId(undefined);
    } catch {
      // Error is shown by Convex client; keep drawer open so user can fix and retry
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    newFeedback,
    setNewFeedback,
    isSubmitting,
    submitTagId,
    setSubmitTagId,
    submitAssigneeId,
    setSubmitAssigneeId,
    handleSubmitFeedback,
  } as const;
}
