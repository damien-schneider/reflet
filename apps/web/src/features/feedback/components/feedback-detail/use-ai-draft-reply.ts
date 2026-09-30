"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

interface UseAIDraftReplyParams {
  effectiveIsAdmin: boolean;
  feedbackId: Id<"feedback"> | null;
  setNewComment: (comment: string) => void;
}

export function useAIDraftReply({
  feedbackId,
  effectiveIsAdmin,
  setNewComment,
}: UseAIDraftReplyParams) {
  const draftReplyStatus = useQuery(
    api.feedback.draft_reply.getDraftReplyStatus,
    feedbackId && effectiveIsAdmin ? { feedbackId } : "skip"
  );
  const initiateDraftReply = useMutation(
    api.feedback.draft_reply.initiateDraftReply
  );
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  const readyDraft = draftReplyStatus?.aiDraftReply;
  if (readyDraft && isGeneratingDraft) {
    setIsGeneratingDraft(false);
    setNewComment(readyDraft);
  }

  const handleGenerateDraftReply = async () => {
    if (!feedbackId) {
      return;
    }
    setIsGeneratingDraft(true);
    try {
      await initiateDraftReply({ feedbackId });
    } catch {
      setIsGeneratingDraft(false);
    }
  };

  return {
    handleGenerateDraftReply,
    isGeneratingDraft,
  } as const;
}
