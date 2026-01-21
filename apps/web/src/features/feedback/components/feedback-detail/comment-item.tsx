"use client";

import { Chat, DotsThreeVertical, Pencil, Trash } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
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
import { Textarea } from "@/components/ui/textarea";

import type { CommentData, CommentItemProps } from "./types";

export function CommentItem({ feedbackId, comment }: CommentItemProps) {
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
      await updateComment({ id: comment.id, body: editContent.trim() });
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
    <div className="group relative">
      {/* Threading line for replies */}
      {comment.replies.length > 0 && (
        <div className="absolute top-10 bottom-0 left-4 w-px bg-border" />
      )}

      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.author?.image} />
          <AvatarFallback className="text-xs">
            {comment.author?.name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <CommentHeader comment={comment} />

          {isEditing ? (
            <CommentEditForm
              content={editContent}
              isSubmitting={isSubmitting}
              onCancel={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              onChange={setEditContent}
              onSave={handleEdit}
            />
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {comment.content}
              </p>
              <CommentActions
                onDelete={handleDelete}
                onEdit={() => setIsEditing(true)}
                onReply={() => setIsReplying(true)}
              />
            </>
          )}

          {/* Reply input */}
          {isReplying && (
            <ReplyForm
              content={replyContent}
              isSubmitting={isSubmitting}
              onCancel={() => {
                setIsReplying(false);
                setReplyContent("");
              }}
              onChange={setReplyContent}
              onSubmit={handleReply}
            />
          )}

          {/* Replies */}
          {comment.replies.length > 0 && (
            <CommentReplies feedbackId={feedbackId} replies={comment.replies} />
          )}
        </div>
      </div>
    </div>
  );
}

function CommentHeader({ comment }: { comment: CommentData }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-sm">
        {comment.author?.name || "Anonymous"}
      </span>
      <span className="text-muted-foreground text-xs">
        {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
      </span>
    </div>
  );
}

interface CommentActionsProps {
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CommentActions({ onReply, onEdit, onDelete }: CommentActionsProps) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <button
        className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
        onClick={onReply}
        type="button"
      >
        <Chat className="h-3.5 w-3.5" />
        Reply
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <DotsThreeVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface CommentEditFormProps {
  content: string;
  isSubmitting: boolean;
  onChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function CommentEditForm({
  content,
  isSubmitting,
  onChange,
  onSave,
  onCancel,
}: CommentEditFormProps) {
  return (
    <div className="mt-2 space-y-2">
      <Textarea
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        value={content}
      />
      <div className="flex gap-2">
        <Button onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
        <Button
          disabled={!content.trim() || isSubmitting}
          onClick={onSave}
          size="sm"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

interface ReplyFormProps {
  content: string;
  isSubmitting: boolean;
  onChange: (content: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function ReplyForm({
  content,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: ReplyFormProps) {
  return (
    <div className="mt-3 rounded-lg border bg-background p-3">
      <Textarea
        autoFocus
        className="min-h-16 resize-none border-0 p-0 focus-visible:ring-0"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write a reply..."
        value={content}
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
        <Button
          disabled={!content.trim() || isSubmitting}
          onClick={onSubmit}
          size="sm"
        >
          {isSubmitting ? "Posting..." : "Reply"}
        </Button>
      </div>
    </div>
  );
}

interface CommentRepliesProps {
  feedbackId: Id<"feedback">;
  replies: CommentData[];
}

function CommentReplies({ feedbackId, replies }: CommentRepliesProps) {
  return (
    <div className="relative mt-4 space-y-4 pl-4">
      {replies.map((reply, index) => (
        <ReplyItem
          feedbackId={feedbackId}
          isLast={index === replies.length - 1}
          key={reply.id}
          reply={reply}
        />
      ))}
    </div>
  );
}

interface ReplyItemProps {
  feedbackId: Id<"feedback">;
  reply: CommentData;
  isLast: boolean;
}

function ReplyItem({ feedbackId, reply, isLast }: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateComment = useMutation(api.comments.update);
  const deleteComment = useMutation(api.comments.remove);

  const handleEdit = useCallback(async () => {
    if (!editContent.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateComment({ id: reply.id, body: editContent.trim() });
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [reply.id, editContent, updateComment]);

  const handleDelete = useCallback(async () => {
    await deleteComment({ id: reply.id });
  }, [reply.id, deleteComment]);

  return (
    <div className="group relative flex gap-3">
      {/* Horizontal connector */}
      <div className="absolute top-4 -left-4 h-px w-4 bg-border" />

      {/* Vertical line for remaining replies */}
      {!isLast && (
        <div className="absolute top-4 bottom-0 -left-4 w-px bg-border" />
      )}

      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={reply.author?.image} />
        <AvatarFallback className="text-xs">
          {reply.author?.name?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <CommentHeader comment={reply} />

        {isEditing ? (
          <CommentEditForm
            content={editContent}
            isSubmitting={isSubmitting}
            onCancel={() => {
              setIsEditing(false);
              setEditContent(reply.content);
            }}
            onChange={setEditContent}
            onSave={handleEdit}
          />
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap text-sm">{reply.content}</p>
            <div className="mt-1">
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <DotsThreeVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
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
          </>
        )}

        {/* Nested replies */}
        {reply.replies.length > 0 && (
          <CommentReplies feedbackId={feedbackId} replies={reply.replies} />
        )}
      </div>
    </div>
  );
}
