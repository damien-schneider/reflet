"use client";

import {
  Calendar,
  CaretUp,
  Chat,
  DotsThreeVertical,
  PaperPlaneRight,
  PushPin,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PublicFeedbackDetailContentProps {
  feedbackId: Id<"feedback">;
  boardId: Id<"boards">;
  primaryColor: string;
  isMember?: boolean;
  isAdmin?: boolean;
}

export function PublicFeedbackDetailContent({
  feedbackId,
  boardId,
  primaryColor,
  isMember: _isMember = false,
  isAdmin = false,
}: PublicFeedbackDetailContentProps) {
  const feedback = useQuery(api.feedback.get, { id: feedbackId });
  const comments = useQuery(api.comments.list, { feedbackId });
  const boardStatuses = useQuery(api.board_statuses.list, { boardId });

  const toggleVote = useMutation(api.votes.toggle);
  const createComment = useMutation(api.comments.create);
  const updateFeedbackStatus = useMutation(api.feedback_actions.updateStatus);
  const togglePin = useMutation(api.feedback_actions.togglePin);

  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const handleVote = useCallback(async () => {
    await toggleVote({ feedbackId, voteType: "upvote" });
  }, [feedbackId, toggleVote]);

  const handleStatusChange = useCallback(
    async (statusId: string | null) => {
      if (!statusId) {
        return;
      }
      await updateFeedbackStatus({
        feedbackId,
        statusId: statusId as Id<"boardStatuses">,
      });
    },
    [feedbackId, updateFeedbackStatus]
  );

  const handleTogglePin = useCallback(async () => {
    await togglePin({ id: feedbackId });
  }, [feedbackId, togglePin]);

  const handleSubmitComment = useCallback(async () => {
    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
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

  const isLoading = feedback === undefined;
  const currentStatus = boardStatuses?.find(
    (s) => s._id === feedback?.statusId
  );

  const topLevelComments = comments?.filter((c) => !c.parentId) || [];
  const commentReplies = (parentId: string) =>
    comments?.filter((c) => c.parentId === parentId) || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Feedback not found
      </div>
    );
  }

  return (
    <div className="flex max-h-[90vh] flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b p-6">
        <div className="flex items-start gap-4">
          {/* Vote button */}
          <button
            className={cn(
              "flex flex-col items-center rounded-lg border p-3 transition-colors hover:bg-accent",
              feedback.hasVoted && "border-primary bg-primary/10 text-primary"
            )}
            onClick={handleVote}
            style={
              feedback.hasVoted
                ? {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }
                : undefined
            }
            type="button"
          >
            <CaretUp className="h-5 w-5" />
            <span className="font-bold text-lg">{feedback.voteCount}</span>
          </button>

          <div className="flex-1">
            {/* Title */}
            <div className="flex items-center gap-2">
              {feedback.isPinned && isAdmin && (
                <PushPin className="h-4 w-4 text-primary" />
              )}
              <h2 className="font-semibold text-xl">{feedback.title}</h2>
            </div>

            {/* Meta info */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(feedback.createdAt, {
                  addSuffix: true,
                })}
              </span>
              <span className="flex items-center gap-1">
                <Chat className="h-3 w-3" />
                {feedback.commentCount} comments
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status - show as select for admins, badge for others */}
          {isAdmin && boardStatuses && boardStatuses.length > 0 ? (
            <Select
              onValueChange={handleStatusChange}
              value={feedback.statusId || ""}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {boardStatuses.map((status) => (
                  <SelectItem key={status._id} value={status._id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            currentStatus && (
              <Badge
                style={{
                  backgroundColor: `${currentStatus.color}20`,
                  color: currentStatus.color,
                }}
                variant="secondary"
              >
                {currentStatus.name}
              </Badge>
            )
          )}

          {/* Admin actions menu */}
          {isAdmin && (
            <DropdownList>
              <DropdownListTrigger
                render={(props) => (
                  <Button {...props} size="icon" variant="ghost">
                    <DotsThreeVertical className="h-4 w-4" />
                  </Button>
                )}
              />
              <DropdownListContent align="end">
                <DropdownListItem onClick={handleTogglePin}>
                  <PushPin className="mr-2 h-4 w-4" />
                  {feedback.isPinned ? "Unpin" : "Pin"}
                </DropdownListItem>
              </DropdownListContent>
            </DropdownList>
          )}
        </div>
      </div>

      {/* Content area - scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Description */}
        <div className="mb-6">
          <h3 className="mb-2 font-medium">Description</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {feedback.description || "No description provided."}
          </p>
        </div>

        {/* Tags */}
        {feedback.tags && feedback.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 font-medium">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {feedback.tags
                .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
                .map((tag) => (
                  <Badge
                    key={tag._id}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                    variant="secondary"
                  >
                    {tag.name}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        <Separator className="my-6" />

        {/* Comments section */}
        <div>
          <h3 className="mb-4 font-medium">
            Comments ({comments?.length || 0})
          </h3>

          {/* Comment input */}
          <div className="mb-6 flex gap-2">
            <Textarea
              className="flex-1"
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmitComment();
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
              onClick={handleSubmitComment}
              size="icon"
            >
              <PaperPlaneRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Comments list */}
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

                      {/* Replies */}
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
                                    <Badge
                                      className="text-xs"
                                      variant="secondary"
                                    >
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
      </div>
    </div>
  );
}
