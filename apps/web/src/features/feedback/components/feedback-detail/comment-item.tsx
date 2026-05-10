"use client";

import {
  ArrowBendDownRight,
  DotsThree,
  PaperPlaneTilt,
  Pencil,
  Trash,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";

import { useFeedbackId } from "./comment-context";
import type { CommentData } from "./types";

interface CommentItemOwnProps {
  comment: CommentData;
  isReply?: boolean;
}

export function CommentItem({ comment, isReply = false }: CommentItemOwnProps) {
  const feedbackId = useFeedbackId();
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateComment = useMutation(api.feedback.comments.update);
  const deleteComment = useMutation(api.feedback.comments.remove);
  const addReply = useMutation(api.feedback.comments.create);

  const handleEdit = async () => {
    const trimmedContent = editingContent?.trim();
    if (!trimmedContent) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateComment({
        id: comment.id,
        body: trimmedContent,
      });
      setEditingContent(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    await deleteComment({ id: comment.id });
  };

  const handleReply = async () => {
    const trimmedContent = replyContent?.trim();
    if (!trimmedContent) {
      return;
    }
    setIsSubmitting(true);
    try {
      await addReply({
        feedbackId,
        body: trimmedContent,
        parentId: comment.id,
      });
      setReplyContent(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = editingContent !== null;
  const isReplying = replyContent !== null;

  return (
    <div className="group rounded-lg p-3 transition-colors hover:bg-muted/30">
      <div className="flex gap-3">
        <Avatar className={isReply ? "size-6" : "size-8"}>
          <AvatarImage src={comment.author?.image} />
          <AvatarFallback className="text-xs">
            {comment.author?.name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {comment.author?.name ?? "Anonymous"}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </span>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={(props: React.ComponentProps<"button">) => (
                  <Button
                    {...props}
                    className="ml-auto size-6 opacity-0 transition-opacity group-hover:opacity-100"
                    size="icon-sm"
                    variant="ghost"
                  >
                    <DotsThree className="size-4" />
                  </Button>
                )}
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setEditingContent(comment.content)}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-2">
              <div className="overflow-hidden rounded-lg border">
                <TiptapMarkdownEditor
                  className="min-h-[60px]"
                  editable
                  minimal
                  onChange={setEditingContent}
                  onSubmit={handleEdit}
                  value={editingContent}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={() => setEditingContent(null)}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!editingContent.trim() || isSubmitting}
                  onClick={handleEdit}
                  size="sm"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {comment.content}
              </p>

              {/* Reply button */}
              <button
                className="mt-2 flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                onClick={() => setReplyContent("")}
                type="button"
              >
                <ArrowBendDownRight className="size-3" />
                Reply
              </button>
            </>
          )}

          {/* Reply input */}
          {isReplying && (
            <div className="mt-3">
              <div className="overflow-hidden rounded-lg border bg-muted/30">
                <TiptapMarkdownEditor
                  className="min-h-[60px]"
                  editable
                  minimal
                  onChange={setReplyContent}
                  onSubmit={handleReply}
                  placeholder="Write a reply..."
                  value={replyContent}
                />
                <div className="flex items-center justify-end gap-2 border-t bg-muted/50 px-3 py-2">
                  <Button
                    onClick={() => setReplyContent(null)}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="gap-1"
                    disabled={!replyContent.trim() || isSubmitting}
                    onClick={handleReply}
                    size="sm"
                  >
                    <PaperPlaneTilt className="size-3.5" />
                    {isSubmitting ? "Posting..." : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies.length > 0 && (
            <div className="mt-3 space-y-1 border-muted border-l-2 pl-3">
              {comment.replies.map((reply) => (
                <CommentItem comment={reply} isReply key={reply.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
