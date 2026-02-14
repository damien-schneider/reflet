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
import { useCallback, useState } from "react";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateComment = useMutation(api.comments.update);
  const deleteComment = useMutation(api.comments.remove);
  const addReply = useMutation(api.comments.create);

  const handleEdit = useCallback(async () => {
    if (!editContent.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateComment({
        id: comment.id,
        body: editContent.trim(),
      });
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [comment.id, editContent, updateComment]);

  const handleDelete = useCallback(async () => {
    await deleteComment({ id: comment.id });
  }, [comment.id, deleteComment]);

  const handleReply = useCallback(async () => {
    if (!replyContent.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await addReply({
        feedbackId,
        body: replyContent.trim(),
        parentId: comment.id,
      });
      setReplyContent("");
      setIsReplying(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [feedbackId, comment.id, replyContent, addReply]);

  return (
    <div className="group rounded-lg p-3 transition-colors hover:bg-muted/30">
      <div className="flex gap-3">
        <Avatar className={isReply ? "h-6 w-6" : "h-8 w-8"}>
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
                    className="ml-auto h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    size="icon-sm"
                    variant="ghost"
                  >
                    <DotsThree className="h-4 w-4" />
                  </Button>
                )}
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash className="mr-2 h-4 w-4" />
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
                  autoFocus
                  className="min-h-[60px]"
                  editable
                  minimal
                  onChange={setEditContent}
                  onSubmit={handleEdit}
                  value={editContent}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!editContent.trim() || isSubmitting}
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
                onClick={() => setIsReplying(true)}
                type="button"
              >
                <ArrowBendDownRight className="h-3 w-3" />
                Reply
              </button>
            </>
          )}

          {/* Reply input */}
          {isReplying && (
            <div className="mt-3">
              <div className="overflow-hidden rounded-lg border bg-muted/30">
                <TiptapMarkdownEditor
                  autoFocus
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
                    onClick={() => {
                      setIsReplying(false);
                      setReplyContent("");
                    }}
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
                    <PaperPlaneTilt className="h-3.5 w-3.5" />
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
