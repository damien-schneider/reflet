"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  CommentAvatar,
  CommentTimestamp,
} from "../feedback-detail/comment-meta";

interface CommentAuthor {
  email?: string;
  image?: string;
  name?: string;
}

interface Comment {
  _id: string;
  author?: CommentAuthor;
  body: string;
  createdAt: number;
  isOfficial?: boolean;
  parentId?: string;
}

interface PublicFeedbackCommentsProps {
  comments: Comment[] | undefined;
  isAuthenticated: boolean;
  isSubmittingComment: boolean;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onSubmitComment: () => void;
}

function useSubmitCommentHotkey(canSubmit: boolean, onSubmit: () => void) {
  useHotkeys(
    "mod+enter",
    () => {
      if (canSubmit) {
        onSubmit();
      }
    },
    { enabled: canSubmit, enableOnFormTags: true },
    [canSubmit, onSubmit]
  );
}

function buildRepliesMap(comments: Comment[]) {
  const repliesMap = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const existing = repliesMap.get(c.parentId) ?? [];
      existing.push(c);
      repliesMap.set(c.parentId, existing);
    }
  }
  return repliesMap;
}

export function PublicFeedbackComments({
  comments,
  isAuthenticated,
  newComment,
  isSubmittingComment,
  onNewCommentChange,
  onSubmitComment,
}: PublicFeedbackCommentsProps) {
  const canSubmit = Boolean(newComment.trim()) && !isSubmittingComment;
  useSubmitCommentHotkey(canSubmit, onSubmitComment);

  return (
    <div>
      <CommentsHeading comments={comments} />

      {isAuthenticated ? (
        <CommentComposer
          canSubmit={canSubmit}
          isSubmittingComment={isSubmittingComment}
          newComment={newComment}
          onNewCommentChange={onNewCommentChange}
          onSubmitComment={onSubmitComment}
        />
      ) : (
        <Button
          className="mb-6 w-full"
          onClick={onSubmitComment}
          variant="surface"
        >
          Sign in to leave a comment
        </Button>
      )}

      <CommentsBody comments={comments} />
    </div>
  );
}

function CommentsHeading({ comments }: { comments: Comment[] | undefined }) {
  return (
    <h3 className="mb-4 font-medium text-sm">
      Discussion
      {comments && comments.length > 0 && (
        <span className="ml-2 text-muted-foreground tabular-nums">
          ({comments.length})
        </span>
      )}
    </h3>
  );
}

interface CommentComposerProps {
  canSubmit: boolean;
  isSubmittingComment: boolean;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onSubmitComment: () => void;
}

function CommentComposer({
  canSubmit,
  isSubmittingComment,
  newComment,
  onNewCommentChange,
  onSubmitComment,
}: CommentComposerProps) {
  return (
    <div className="mb-6 space-y-2">
      <Textarea
        aria-label="Comment"
        onChange={(e) => onNewCommentChange(e.target.value)}
        placeholder="Write a comment…"
        rows={3}
        value={newComment}
      />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto pointer-fine:inline hidden text-muted-foreground text-xs">
          <kbd className="font-sans">⌘ Enter</kbd> to post
        </span>
        <Button
          disabled={!canSubmit}
          onClick={onSubmitComment}
          size="sm"
          tone="primary"
          variant="solid"
        >
          <PaperPlaneRight className="size-3.5" />
          {isSubmittingComment ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}

function CommentsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      {[1, 2].map((i) => (
        <div className="flex gap-3" key={i}>
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentsBody({ comments }: { comments: Comment[] | undefined }) {
  if (comments === undefined) {
    return <CommentsSkeleton />;
  }

  const topLevelComments = comments.filter((c) => !c.parentId);
  if (topLevelComments.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No comments yet.
      </p>
    );
  }

  const repliesMap = buildRepliesMap(comments);
  return (
    <div className="space-y-4">
      {topLevelComments.map((comment) => (
        <PublicCommentItem
          comment={comment}
          key={comment._id}
          repliesMap={repliesMap}
        />
      ))}
    </div>
  );
}

function PublicCommentItem({
  comment,
  repliesMap,
  isReply = false,
}: {
  comment: Comment;
  repliesMap: Map<string, Comment[]>;
  isReply?: boolean;
}) {
  const replies = repliesMap.get(comment._id) ?? [];

  return (
    <div className="group flex gap-3">
      <CommentAvatar
        image={comment.author?.image}
        isReply={isReply}
        name={comment.author?.name || comment.author?.email || "?"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">
            {comment.author?.name || comment.author?.email || "Anonymous"}
          </span>
          {comment.isOfficial && <Badge size="sm">Official</Badge>}
          <CommentTimestamp createdAt={comment.createdAt} />
        </div>

        <p className="mt-1 whitespace-pre-wrap text-pretty text-sm leading-relaxed">
          {comment.body}
        </p>

        {replies.length > 0 && (
          <div className="mt-4 space-y-3 border-border border-l-2 pl-4">
            {replies.map((reply) => (
              <PublicCommentItem
                comment={reply}
                isReply
                key={reply._id}
                repliesMap={repliesMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
