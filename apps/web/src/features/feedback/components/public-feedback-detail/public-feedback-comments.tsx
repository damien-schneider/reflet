"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { useHotkeys } from "react-hotkeys-hook";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface CommentAuthor {
  name?: string;
  email?: string;
  image?: string;
}

interface Comment {
  _id: string;
  body: string;
  createdAt: number;
  author?: CommentAuthor;
  isOfficial?: boolean;
  parentId?: string;
}

interface PublicFeedbackCommentsProps {
  comments: Comment[] | undefined;
  newComment: string;
  isSubmittingComment: boolean;
  onNewCommentChange: (value: string) => void;
  onSubmitComment: () => void;
}

export function PublicFeedbackComments({
  comments,
  newComment,
  isSubmittingComment,
  onNewCommentChange,
  onSubmitComment,
}: PublicFeedbackCommentsProps) {
  const canSubmit = Boolean(newComment.trim()) && !isSubmittingComment;

  useHotkeys(
    "mod+enter",
    () => {
      if (canSubmit) {
        onSubmitComment();
      }
    },
    { enabled: canSubmit, enableOnFormTags: true },
    [canSubmit, onSubmitComment]
  );

  const topLevelComments = comments?.filter((c) => !c.parentId) || [];
  const repliesMap = new Map<string, Comment[]>();
  for (const c of comments ?? []) {
    if (c.parentId) {
      const existing = repliesMap.get(c.parentId) ?? [];
      existing.push(c);
      repliesMap.set(c.parentId, existing);
    }
  }

  return (
    <div>
      <h3 className="mb-4 font-medium">Comments ({comments?.length || 0})</h3>

      <div className="mb-6 flex gap-2">
        <Textarea
          className="flex-1"
          onChange={(e) => onNewCommentChange(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
          value={newComment}
        />
        <Button
          className="self-end"
          disabled={!newComment.trim() || isSubmittingComment}
          onClick={onSubmitComment}
          size="icon"
        >
          <PaperPlaneRight className="h-4 w-4" />
        </Button>
      </div>

      {comments === undefined && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div className="flex gap-3" key={i}>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      {comments !== undefined && topLevelComments.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          No comments yet. Be the first to comment!
        </p>
      )}
      {comments !== undefined && topLevelComments.length > 0 && (
        <div className="space-y-4">
          {topLevelComments.map((comment) => (
            <PublicCommentItem
              comment={comment}
              key={comment._id}
              repliesMap={repliesMap}
            />
          ))}
        </div>
      )}
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
      <Avatar className={isReply ? "h-6 w-6" : "h-8 w-8"}>
        <AvatarImage src={comment.author?.image} />
        <AvatarFallback className={isReply ? "text-xs" : ""}>
          {comment.author?.name?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {comment.author?.name || comment.author?.email || "Anonymous"}
          </span>
          {comment.isOfficial && (
            <Badge className="text-xs" variant="secondary">
              Official
            </Badge>
          )}
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(comment.createdAt, {
              addSuffix: true,
            })}
          </span>
        </div>

        <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>

        {replies.length > 0 && (
          <div className="mt-4 space-y-3 border-l-2 pl-4">
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
