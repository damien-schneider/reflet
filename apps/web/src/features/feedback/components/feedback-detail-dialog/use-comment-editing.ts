"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useCallback, useState } from "react";

interface CreateCommentArgs {
  body: string;
  feedbackId: Id<"feedback">;
  parentId?: Id<"comments">;
}

interface UpdateCommentArgs {
  body: string;
  id: Id<"comments">;
}

interface DeleteCommentArgs {
  id: Id<"comments">;
}

interface UseCommentEditingParams {
  createComment: (args: CreateCommentArgs) => Promise<unknown>;
  deleteComment: (args: DeleteCommentArgs) => Promise<unknown>;
  feedbackId: Id<"feedback"> | null;
  updateComment: (args: UpdateCommentArgs) => Promise<unknown>;
}

export function useCommentEditing({
  feedbackId,
  createComment,
  updateComment,
  deleteComment,
}: UseCommentEditingParams) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Id<"comments"> | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingCommentId, setEditingCommentId] =
    useState<Id<"comments"> | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<Id<"comments"> | null>(
    null
  );

  const handleSubmitComment = useCallback(async () => {
    const trimmedComment = newComment.trim();
    if (!(feedbackId && trimmedComment)) {
      return;
    }
    setIsSubmittingComment(true);
    try {
      await createComment({ body: trimmedComment, feedbackId });
      setNewComment("");
    } finally {
      setIsSubmittingComment(false);
    }
  }, [feedbackId, newComment, createComment]);

  const handleSubmitReply = useCallback(
    async (parentId: Id<"comments">) => {
      const trimmedReply = replyContent.trim();
      if (!(feedbackId && trimmedReply)) {
        return;
      }
      setIsSubmittingComment(true);
      try {
        await createComment({
          body: trimmedReply,
          feedbackId,
          parentId,
        });
        setReplyContent("");
        setReplyingTo(null);
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [feedbackId, replyContent, createComment]
  );

  const handleUpdateComment = useCallback(
    async (commentId: Id<"comments">) => {
      const trimmedContent = editCommentContent.trim();
      if (!trimmedContent) {
        return;
      }
      await updateComment({
        body: trimmedContent,
        id: commentId,
      });
      setEditingCommentId(null);
      setEditCommentContent("");
    },
    [editCommentContent, updateComment]
  );

  const handleDeleteComment = useCallback(async () => {
    if (!commentToDelete) {
      return;
    }
    await deleteComment({ id: commentToDelete });
    setCommentToDelete(null);
  }, [commentToDelete, deleteComment]);

  return {
    commentToDelete,
    editCommentContent,
    editingCommentId,
    handleDeleteComment,
    handleSubmitComment,
    handleSubmitReply,
    handleUpdateComment,
    isSubmittingComment,
    newComment,
    replyContent,
    replyingTo,
    setCommentToDelete,
    setEditCommentContent,
    setEditingCommentId,
    setNewComment,
    setReplyContent,
    setReplyingTo,
  } as const;
}
