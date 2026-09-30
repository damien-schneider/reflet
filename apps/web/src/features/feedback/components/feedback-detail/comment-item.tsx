"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  ArrowBendDownRight,
  DotsThree,
  PaperPlaneTilt,
  Pencil,
  Trash,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";

import { useFeedbackId } from "./comment-context";
import { CommentAvatar, CommentTimestamp } from "./comment-meta";
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const updateComment = useMutation(api.feedback.comments.update);
  const deleteComment = useMutation(api.feedback.comments.remove);
  const addReply = useMutation(api.feedback.comments.create);

  const handleEdit = async () => {
    const body = editContent.trim();
    if (!body) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateComment({ body, id: comment.id });
      setIsEditing(false);
    } catch {
      toast.error("Couldn’t save your edit. Try again.");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    await deleteComment({ id: comment.id });
  };

  const handleReply = async () => {
    const body = replyContent.trim();
    if (!body) {
      return;
    }
    setIsSubmitting(true);
    try {
      await addReply({ body, feedbackId, parentId: comment.id });
      setReplyContent("");
      setIsReplying(false);
    } catch {
      toast.error("Couldn’t post your reply. Try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="group rounded-lg p-3 hover:bg-muted/30">
      <div className="flex gap-3">
        <CommentAvatar
          image={comment.author?.image}
          isReply={isReply}
          name={comment.author?.name ?? "?"}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">
              {comment.author?.name ?? "Anonymous"}
            </span>
            <CommentTimestamp createdAt={comment.createdAt} />

            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Comment actions"
                render={(props: React.ComponentProps<"button">) => (
                  <Button
                    {...props}
                    className="pointer-fine:pointer-events-none ml-auto pointer-fine:opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 data-popup-open:pointer-events-auto data-popup-open:opacity-100"
                    iconOnly
                    size="xs"
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
                  className="menu-item-danger"
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
                  size="xs"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!editContent.trim() || isSubmitting}
                  onClick={handleEdit}
                  size="xs"
                  tone="primary"
                  variant="solid"
                >
                  {isSubmitting ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-pretty text-sm leading-relaxed">
                {comment.content}
              </p>

              <Button
                className="mt-1 -ml-2"
                onClick={() => setIsReplying(true)}
                size="xs"
                variant="ghost"
              >
                <ArrowBendDownRight className="size-3.5" />
                Reply
              </Button>
            </>
          )}

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
                  placeholder="Write a reply…"
                  value={replyContent}
                />
                <div className="flex items-center justify-end gap-2 border-t bg-muted/50 px-3 py-2">
                  <Button
                    onClick={() => {
                      setIsReplying(false);
                      setReplyContent("");
                    }}
                    size="xs"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!replyContent.trim() || isSubmitting}
                    onClick={handleReply}
                    size="xs"
                    tone="primary"
                    variant="solid"
                  >
                    <PaperPlaneTilt className="size-3.5" />
                    {isSubmitting ? "Posting…" : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {comment.replies.length > 0 && (
            <div className="mt-3 space-y-1 border-border border-l-2 pl-3">
              {comment.replies.map((reply) => (
                <CommentItem comment={reply} isReply key={reply.id} />
              ))}
            </div>
          )}
        </div>
      </div>

      <DestructiveConfirmDialog
        confirmLabel="Delete comment"
        description="This removes the comment for everyone. You can’t undo this."
        onConfirm={handleDelete}
        onOpenChange={setIsConfirmingDelete}
        open={isConfirmingDelete}
        title="Delete comment?"
      />
    </div>
  );
}
