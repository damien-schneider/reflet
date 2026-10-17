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
  const [pendingRequest, setPendingRequest] = useState<{
    previousGeneratedAt: number | undefined;
  } | null>(null);

  const readyDraft = draftReplyStatus?.aiDraftReply;
  const readyGeneratedAt = draftReplyStatus?.aiDraftReplyGeneratedAt;
  if (
    pendingRequest &&
    readyDraft &&
    readyGeneratedAt !== pendingRequest.previousGeneratedAt
  ) {
    setPendingRequest(null);
    setNewComment(readyDraft);
  }

  const handleGenerateDraftReply = async () => {
    if (!feedbackId) {
      return;
    }
    setPendingRequest({ previousGeneratedAt: readyGeneratedAt });
    try {
      await initiateDraftReply({ feedbackId });
    } catch {
      setPendingRequest(null);
    }
  };

  return {
    handleGenerateDraftReply,
    isGeneratingDraft: pendingRequest !== null,
  } as const;
}
