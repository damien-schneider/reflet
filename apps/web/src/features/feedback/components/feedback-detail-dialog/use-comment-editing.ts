"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useCallback, useState } from "react";

interface CreateCommentArgs {
  feedbackId: Id<"feedback">;
  body: string;
  parentId?: Id<"comments">;
}

interface UpdateCommentArgs {
  id: Id<"comments">;
  body: string;
}

interface DeleteCommentArgs {
  id: Id<"comments">;
}

interface UseCommentEditingParams {
  feedbackId: Id<"feedback"> | null;
  createComment: (args: CreateCommentArgs) => Promise<unknown>;
  updateComment: (args: UpdateCommentArgs) => Promise<unknown>;
  deleteComment: (args: DeleteCommentArgs) => Promise<unknown>;
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
      await createComment({ feedbackId, body: trimmedComment });
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
          feedbackId,
          body: trimmedReply,
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
        id: commentId,
        body: trimmedContent,
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
    newComment,
    setNewComment,
    replyingTo,
    setReplyingTo,
    replyContent,
    setReplyContent,
    editingCommentId,
    setEditingCommentId,
    editCommentContent,
    setEditCommentContent,
    isSubmittingComment,
    commentToDelete,
    setCommentToDelete,
    handleSubmitComment,
    handleSubmitReply,
    handleUpdateComment,
    handleDeleteComment,
  } as const;
}
