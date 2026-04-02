"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

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
    api.feedback.clarification.getDraftReplyStatus,
    feedbackId && effectiveIsAdmin ? { feedbackId } : "skip"
  );
  const initiateDraftReply = useMutation(
    api.feedback.clarification.initiateDraftReply
  );
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Populate comment input when draft reply is ready
  useEffect(
    function populateCommentWithDraftReply() {
      if (draftReplyStatus?.aiDraftReply && isGeneratingDraft) {
        setNewComment(draftReplyStatus.aiDraftReply);
        setIsGeneratingDraft(false);
      }
    },
    [draftReplyStatus?.aiDraftReply, isGeneratingDraft, setNewComment]
  );

  const handleGenerateDraftReply = useCallback(async () => {
    if (!feedbackId) {
      return;
    }
    setIsGeneratingDraft(true);
    try {
      await initiateDraftReply({ feedbackId });
    } catch {
      setIsGeneratingDraft(false);
    }
  }, [feedbackId, initiateDraftReply]);

  return {
    isGeneratingDraft,
    handleGenerateDraftReply,
  } as const;
}
