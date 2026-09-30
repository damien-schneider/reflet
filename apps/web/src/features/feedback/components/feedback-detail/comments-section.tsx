"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { PaperPlaneTilt, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { cn } from "@/lib/utils";
import { CommentProvider } from "./comment-context";
import { CommentItem } from "./comment-item";
import type { CommentData } from "./types";
import { useAIDraftReply } from "./use-ai-draft-reply";

interface CommentsSectionProps {
  feedbackId: Id<"feedback">;
  isAdmin?: boolean;
}

export function CommentsSection({
  feedbackId,
  isAdmin = false,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsData = useQuery(api.feedback.comments.list, { feedbackId });
  const addComment = useMutation(api.feedback.comments.create);

  const { isGeneratingDraft, handleGenerateDraftReply } = useAIDraftReply({
    effectiveIsAdmin: isAdmin,
    feedbackId,
    setNewComment,
  });

  const handleSubmitComment = async () => {
    const body = newComment.trim();
    if (!body || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment({ body, feedbackId });
      setNewComment("");
    } catch {
      toast.error("Couldn’t post your comment. Try again.");
    }
    setIsSubmitting(false);
  };

  const comments = buildCommentTree(commentsData ?? []);
  const commentCount = commentsData?.length ?? 0;

  return (
    <div className="space-y-6">
      <h3 className="font-medium text-sm">
        Discussion
        {commentCount > 0 && (
          <span className="ml-2 text-muted-foreground tabular-nums">
            ({commentCount})
          </span>
        )}
      </h3>

      <CommentInput
        isAdmin={isAdmin}
        isGeneratingDraft={isGeneratingDraft}
        isSubmitting={isSubmitting}
        onCommentChange={setNewComment}
        onGenerateDraft={handleGenerateDraftReply}
        onSubmit={handleSubmitComment}
        value={newComment}
      />

      <CommentProvider feedbackId={feedbackId}>
        <CommentList
          comments={comments}
          isLoading={commentsData === undefined}
        />
      </CommentProvider>
    </div>
  );
}

function CommentList({
  comments,
  isLoading,
}: {
  comments: CommentData[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-4 p-3">
        {["first", "second"].map((key) => (
          <div className="flex gap-3" key={key}>
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (comments.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No comments yet.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {comments.map((comment) => (
        <CommentItem comment={comment} key={comment.id} />
      ))}
    </div>
  );
}

interface CommentInputProps {
  isAdmin: boolean;
  isGeneratingDraft: boolean;
  isSubmitting: boolean;
  onCommentChange: (value: string) => void;
  onGenerateDraft: () => void;
  onSubmit: () => void;
  value: string;
}

function CommentInput({
  value,
  onCommentChange,
  onSubmit,
  isSubmitting,
  isAdmin,
  isGeneratingDraft,
  onGenerateDraft,
}: CommentInputProps) {
  const canSubmit = Boolean(value.trim()) && !isSubmitting;

  const handleKeyboardSubmit = () => {
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/30 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30">
      <TiptapMarkdownEditor
        className="min-h-[80px]"
        editable
        minimal
        onChange={onCommentChange}
        onSubmit={handleKeyboardSubmit}
        placeholder="Write a comment…"
        value={value}
      />
      <div className="flex items-center justify-end gap-2 border-t bg-muted/50 px-3 py-2">
        <span className="mr-auto pointer-fine:inline hidden text-muted-foreground text-xs">
          <kbd className="font-sans">⌘ Enter</kbd> to post
        </span>
        {isAdmin && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  disabled={isGeneratingDraft}
                  onClick={onGenerateDraft}
                  size="xs"
                  variant="ghost"
                />
              }
            >
              <Sparkle
                className={cn(
                  "h-3.5 w-3.5",
                  isGeneratingDraft && "motion-safe:animate-spin"
                )}
              />
              {isGeneratingDraft ? "Drafting…" : "Draft reply"}
            </TooltipTrigger>
            <TooltipContent>Draft a reply with AI</TooltipContent>
          </Tooltip>
        )}
        <Button
          disabled={!canSubmit}
          onClick={onSubmit}
          size="xs"
          tone="primary"
          variant="solid"
        >
          <PaperPlaneTilt className="size-3.5" />
          {isSubmitting ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}

interface RawComment {
  _id: Id<"comments">;
  author?: {
    name?: string;
    email: string;
    image?: string;
  };
  body: string;
  createdAt: number;
  parentId?: Id<"comments">;
}

function buildCommentTree(rawComments: RawComment[]): CommentData[] {
  const commentMap = new Map<string, CommentData>();
  const rootComments: CommentData[] = [];

  for (const comment of rawComments) {
    commentMap.set(comment._id, {
      author: comment.author
        ? {
            email: comment.author.email,
            image: comment.author.image,
            name: comment.author.name,
          }
        : undefined,
      content: comment.body,
      createdAt: comment.createdAt,
      id: comment._id,
      replies: [],
    });
  }

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
