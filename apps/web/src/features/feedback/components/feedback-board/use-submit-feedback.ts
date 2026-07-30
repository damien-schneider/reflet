"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { capture } from "@/lib/analytics";

interface NewFeedbackState {
  attachments: string[];
  description: string;
  email: string;
  title: string;
}

const INITIAL_FEEDBACK: NewFeedbackState = {
  attachments: [],
  description: "",
  email: "",
  title: "",
};

const MAX_TITLE_LENGTH = 100;

interface UseSubmitFeedbackParams {
  assignFeedback: (args: {
    feedbackId: Id<"feedback">;
    assigneeId: string;
  }) => Promise<unknown>;
  closeSubmitDrawer: () => void;
  createFeedbackMember: (args: {
    organizationId: Id<"organizations">;
    title: string;
    description: string;
    attachments?: string[];
    tagId?: Id<"tags">;
  }) => Promise<Id<"feedback">>;
  createFeedbackPublic: (args: {
    organizationId: Id<"organizations">;
    title: string;
    description?: string;
    email?: string;
    attachments?: string[];
  }) => Promise<unknown>;
  isMember: boolean;
  organizationId: Id<"organizations">;
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
          attachments,
          description: newFeedback.description.trim() || "",
          organizationId,
          tagId: submitTagId,
          title: trimmedTitle,
        });
      } else {
        await createFeedbackPublic({
          attachments,
          description: newFeedback.description.trim() || undefined,
          email: newFeedback.email.trim() || undefined,
          organizationId,
          title: trimmedTitle,
        });
      }
      capture("feedback_created", {
        source: isMember ? "admin" : "public_board",
      });
      if (createdFeedbackId && submitAssigneeId) {
        await assignFeedback({
          assigneeId: submitAssigneeId,
          feedbackId: createdFeedbackId,
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
    handleSubmitFeedback,
    isSubmitting,
    newFeedback,
    setNewFeedback,
    setSubmitAssigneeId,
    setSubmitTagId,
    submitAssigneeId,
    submitTagId,
  } as const;
}
