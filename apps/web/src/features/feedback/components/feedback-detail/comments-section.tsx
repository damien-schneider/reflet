"use client";

import { PaperPlaneTilt } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";

import { CommentProvider } from "./comment-context";
import { CommentItem } from "./comment-item";
import type { CommentData } from "./types";

interface CommentsSectionProps {
  feedbackId: Id<"feedback">;
  currentUser?: {
    name?: string | null;
    image?: string | null;
  } | null;
}

export function CommentsSection({
  feedbackId,
  currentUser,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsData = useQuery(api.comments.list, { feedbackId });
  const addComment = useMutation(api.comments.create);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment({
        feedbackId,
        body: newComment.trim(),
      });
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  }, [feedbackId, newComment, isSubmitting, addComment]);

  // Transform comments to CommentData format with nested replies
  const comments = buildCommentTree(commentsData ?? []);
  const commentCount = commentsData?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <h3 className="font-medium text-sm">
        Discussion
        {commentCount > 0 && (
          <span className="ml-2 text-muted-foreground">({commentCount})</span>
        )}
      </h3>

      {/* Comment Input */}
      <CommentInput
        currentUser={currentUser}
        isSubmitting={isSubmitting}
        onCommentChange={setNewComment}
        onSubmit={handleSubmitComment}
        value={newComment}
      />

      {/* Comments List */}
      <CommentProvider feedbackId={feedbackId}>
        <div className="space-y-1">
          {comments.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No comments yet. Start the conversation!
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem comment={comment} key={comment.id} />
            ))
          )}
        </div>
      </CommentProvider>
    </div>
  );
}

interface CommentInputProps {
  currentUser?: {
    name?: string | null;
    image?: string | null;
  } | null;
  value: string;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function CommentInput({
  currentUser,
  value,
  onCommentChange,
  onSubmit,
  isSubmitting,
}: CommentInputProps) {
  const canSubmit = Boolean(value.trim()) && !isSubmitting;

  const handleKeyboardSubmit = useCallback(() => {
    if (canSubmit) {
      onSubmit();
    }
  }, [canSubmit, onSubmit]);

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={currentUser?.image ?? undefined} />
        <AvatarFallback className="text-xs">
          {currentUser?.name?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="overflow-hidden rounded-xl border bg-muted/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <TiptapMarkdownEditor
            className="min-h-[80px]"
            editable
            minimal
            onChange={onCommentChange}
            onSubmit={handleKeyboardSubmit}
            placeholder="Write a comment... (Cmd+Enter to submit)"
            value={value}
          />
          <div className="flex items-center justify-end border-t bg-muted/50 px-3 py-2">
            <Button
              className="h-8 gap-1.5"
              disabled={!canSubmit}
              onClick={onSubmit}
              size="sm"
            >
              <PaperPlaneTilt className="h-3.5 w-3.5" />
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to build comment tree from flat list
interface RawComment {
  _id: Id<"comments">;
  body: string;
  createdAt: number;
  parentId?: Id<"comments">;
  author?: {
    name?: string;
    email: string;
    image?: string;
  };
}

function buildCommentTree(rawComments: RawComment[]): CommentData[] {
  const commentMap = new Map<string, CommentData>();
  const rootComments: CommentData[] = [];

  // First pass: create CommentData objects
  for (const comment of rawComments) {
    commentMap.set(comment._id, {
      id: comment._id,
      content: comment.body,
      createdAt: comment.createdAt,
      author: comment.author
        ? {
            name: comment.author.name,
            email: comment.author.email,
            image: comment.author.image,
          }
        : undefined,
      replies: [],
    });
  }

  // Second pass: build tree structure
  for (const comment of rawComments) {
    const commentData = commentMap.get(comment._id);
    if (!commentData) {
      continue;
    }

    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(commentData);
      }
    } else {
      rootComments.push(commentData);
    }
  }

  return rootComments;
}
