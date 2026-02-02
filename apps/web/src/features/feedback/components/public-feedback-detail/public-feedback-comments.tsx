"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { useRef } from "react";

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
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const topLevelComments = comments?.filter((c) => !c.parentId) || [];
  const commentReplies = (parentId: string) =>
    comments?.filter((c) => c.parentId === parentId) || [];

  return (
    <div>
      <h3 className="mb-4 font-medium">Comments ({comments?.length || 0})</h3>

      <div className="mb-6 flex gap-2">
        <Textarea
          className="flex-1"
          onChange={(e) => onNewCommentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              onSubmitComment();
            }
          }}
          placeholder="Write a comment..."
          ref={commentInputRef}
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
            <div className="group" key={comment._id}>
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.author?.image} />
                  <AvatarFallback>
                    {comment.author?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.author?.name ||
                        comment.author?.email ||
                        "Anonymous"}
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

                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {comment.body}
                  </p>

                  {commentReplies(comment._id).length > 0 && (
                    <div className="mt-4 space-y-3 border-l-2 pl-4">
                      {commentReplies(comment._id).map((reply) => (
                        <div className="group flex gap-3" key={reply._id}>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={reply.author?.image} />
                            <AvatarFallback className="text-xs">
                              {reply.author?.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {reply.author?.name ||
                                  reply.author?.email ||
                                  "Anonymous"}
                              </span>
                              {reply.isOfficial && (
                                <Badge className="text-xs" variant="secondary">
                                  Official
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">
                                {formatDistanceToNow(reply.createdAt, {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>

                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {reply.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
