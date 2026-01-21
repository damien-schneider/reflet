"use client";

import {
  Calendar,
  CaretUp,
  Chat,
  Check,
  DotsThreeVertical,
  PaperPlaneRight,
  Pencil,
  PushPin,
  Trash,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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

interface FeedbackDetailDialogProps {
  feedbackId: Id<"feedback"> | null;
  onClose: () => void;
  boardId?: Id<"boards">;
  isMember?: boolean;
  isAdmin?: boolean;
}

export function FeedbackDetailDialog({
  feedbackId,
  onClose,
  boardId,
  isMember: _isMember = false,
  isAdmin = false,
}: FeedbackDetailDialogProps) {
  const feedback = useQuery(
    api.feedback.get,
    feedbackId ? { id: feedbackId } : "skip"
  );
  const comments = useQuery(
    api.comments.list,
    feedbackId ? { feedbackId } : "skip"
  );

  const effectiveBoardId = boardId ?? feedback?.boardId;
  const boardStatuses = useQuery(
    api.board_statuses.list,
    effectiveBoardId ? { boardId: effectiveBoardId } : "skip"
  );

  const updateFeedback = useMutation(api.feedback.update);
  const updateFeedbackStatus = useMutation(api.feedback_actions.updateStatus);
  const deleteFeedback = useMutation(api.feedback_actions.remove);
  const toggleVote = useMutation(api.votes.toggle);
  const togglePin = useMutation(api.feedback_actions.togglePin);
  const createComment = useMutation(api.comments.create);
  const updateComment = useMutation(api.comments.update);
  const deleteComment = useMutation(api.comments.remove);

  // Edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Comment states
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Reset states when feedback changes
  useEffect(() => {
    if (feedback) {
      setEditTitle(feedback.title);
      setEditDescription(feedback.description ?? "");
    }
  }, [feedback]);

  // Use passed isAdmin prop if available, otherwise fall back to feedback role
  const effectiveIsAdmin =
    isAdmin || feedback?.role === "admin" || feedback?.role === "owner";
  const canEdit = feedback?.isAuthor || effectiveIsAdmin;

  const handleVote = useCallback(async () => {
    if (!feedbackId) {
      return;
    }
    await toggleVote({ feedbackId });
  }, [feedbackId, toggleVote]);

  const handleTogglePin = useCallback(async () => {
    if (!feedbackId) {
      return;
    }
    await togglePin({ id: feedbackId });
  }, [feedbackId, togglePin]);

  const handleSaveTitle = useCallback(async () => {
    const trimmedTitle = editTitle.trim();
    if (!(feedbackId && trimmedTitle)) {
      return;
    }
    await updateFeedback({ id: feedbackId, title: trimmedTitle });
    setIsEditingTitle(false);
  }, [feedbackId, editTitle, updateFeedback]);

  const handleSaveDescription = useCallback(async () => {
    if (!feedbackId) {
      return;
    }
    await updateFeedback({ id: feedbackId, description: editDescription });
    setIsEditingDescription(false);
  }, [feedbackId, editDescription, updateFeedback]);

  const handleStatusChange = useCallback(
    async (statusId: Id<"boardStatuses"> | null) => {
      if (!(feedbackId && statusId)) {
        return;
      }
      await updateFeedbackStatus({
        feedbackId,
        statusId,
      });
    },
    [feedbackId, updateFeedbackStatus]
  );

  const handleDelete = useCallback(async () => {
    if (!feedbackId) {
      return;
    }
    await deleteFeedback({ id: feedbackId });
    setShowDeleteDialog(false);
    onClose();
  }, [feedbackId, deleteFeedback, onClose]);

  const handleSubmitComment = useCallback(async () => {
    const trimmedComment = newComment.trim();
    if (!(feedbackId && trimmedComment)) {
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

  const handleSubmitReply = useCallback(
    async (parentId: string) => {
      const trimmedReply = replyContent.trim();
      if (!(feedbackId && trimmedReply)) {
        return;
      }
      setIsSubmittingComment(true);
      try {
        await createComment({
          feedbackId,
          body: trimmedReply,
          parentId: parentId as Id<"comments">,
        });
        setReplyContent("");
        setReplyingTo(null);
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [feedbackId, replyContent, createComment]
  );

  const handleUpdateComment = useCallback(
    async (commentId: string) => {
      const trimmedContent = editCommentContent.trim();
      if (!trimmedContent) {
        return;
      }
      await updateComment({
        id: commentId as Id<"comments">,
        body: trimmedContent,
      });
      setEditingCommentId(null);
      setEditCommentContent("");
    },
    [editCommentContent, updateComment]
  );

  const handleDeleteComment = useCallback(async () => {
    if (!commentToDelete) {
      return;
    }
    await deleteComment({ id: commentToDelete as Id<"comments"> });
    setCommentToDelete(null);
  }, [commentToDelete, deleteComment]);

  if (!feedbackId) {
    return null;
  }

  const isLoading = feedback === undefined;
  const currentStatus = boardStatuses?.find(
    (s) => s._id === feedback?.statusId
  );

  // Build comment tree
  const topLevelComments = comments?.filter((c) => !c.parentId) || [];
  const commentReplies = (parentId: string) =>
    comments?.filter((c) => c.parentId === parentId) || [];

  const renderFeedbackHeader = () => (
    <div className="flex items-start justify-between border-b p-6">
      <div className="flex items-start gap-4">
        {/* Vote button */}
        <button
          className={cn(
            "flex flex-col items-center rounded-lg border p-3 transition-colors hover:bg-accent",
            feedback.hasVoted && "border-primary bg-primary/10 text-primary"
          )}
          onClick={handleVote}
          type="button"
        >
          <CaretUp className="h-5 w-5" />
          <span className="font-bold text-lg">{feedback.voteCount}</span>
        </button>

        <div className="flex-1">
          {/* Title */}
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                className="font-semibold text-lg"
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveTitle();
                  }
                  if (e.key === "Escape") {
                    setIsEditingTitle(false);
                  }
                }}
                value={editTitle}
              />
              <Button onClick={handleSaveTitle} size="icon">
                <Check className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsEditingTitle(false)}
                size="icon"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              className={cn(
                "text-left font-semibold text-xl",
                canEdit && "cursor-pointer transition-colors hover:text-primary"
              )}
              disabled={!canEdit}
              onClick={() => canEdit && setIsEditingTitle(true)}
              type="button"
            >
              {feedback.title}
              {feedback.isPinned && (
                <PushPin className="ml-2 inline h-4 w-4 text-primary" />
              )}
            </button>
          )}

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

      {/* Status & Actions */}
      <div className="flex items-center gap-2">
        {/* Status selector (admin only) */}
        {effectiveIsAdmin && boardStatuses && (
          <Select
            onValueChange={(val) =>
              handleStatusChange(val as Id<"boardStatuses">)
            }
            value={feedback.statusId || undefined}
          >
            <SelectTrigger className="w-35">
              <SelectValue placeholder="Set status">
                {currentStatus && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: currentStatus.color }}
                    />
                    {currentStatus.name}
                  </div>
                )}
              </SelectValue>
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
        )}

        {/* Actions menu */}
        {canEdit && (
          <DropdownList>
            <DropdownListTrigger>
              <Button size="icon" variant="ghost">
                <DotsThreeVertical className="h-4 w-4" />
              </Button>
            </DropdownListTrigger>
            <DropdownListContent align="end">
              <DropdownListItem onClick={() => setIsEditingTitle(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit title
              </DropdownListItem>
              {effectiveIsAdmin && (
                <DropdownListItem onClick={handleTogglePin}>
                  <PushPin className="mr-2 h-4 w-4" />
                  {feedback.isPinned ? "Unpin" : "Pin"} feedback
                </DropdownListItem>
              )}
              <DropdownListSeparator />
              <DropdownListItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete feedback
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        )}
      </div>
    </div>
  );

  const renderFeedbackContent = () => (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Description */}
      <div className="mb-6">
        <h3 className="mb-2 font-medium">Description</h3>
        {isEditingDescription ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              className="min-h-25"
              onChange={(e) => setEditDescription(e.target.value)}
              value={editDescription}
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setIsEditingDescription(false)}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveDescription}>Save</Button>
            </div>
          </div>
        ) : (
          <button
            className={cn(
              "whitespace-pre-wrap text-left text-muted-foreground",
              canEdit &&
                "-m-2 cursor-pointer rounded p-2 transition-colors hover:bg-accent/50"
            )}
            disabled={!canEdit}
            onClick={() => canEdit && setIsEditingDescription(true)}
            type="button"
          >
            {feedback.description || "No description provided."}
          </button>
        )}
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
        <h3 className="mb-4 font-medium">Comments ({comments?.length || 0})</h3>

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
        {renderCommentsSection()}
      </div>
    </div>
  );

  const renderCommentsSection = () => {
    if (comments === undefined) {
      return (
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
      );
    }

    if (topLevelComments.length === 0) {
      return (
        <p className="py-8 text-center text-muted-foreground">
          No comments yet. Be the first to comment!
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {topLevelComments.map((comment) => (
          <CommentItem
            comment={comment}
            editCommentContent={editCommentContent}
            editingCommentId={editingCommentId}
            isAdmin={effectiveIsAdmin}
            isSubmittingComment={isSubmittingComment}
            key={comment._id}
            onDelete={(id) => setCommentToDelete(id)}
            onEdit={(id, content) => {
              setEditingCommentId(id);
              setEditCommentContent(content);
            }}
            onEditCancel={() => {
              setEditingCommentId(null);
              setEditCommentContent("");
            }}
            onEditContentChange={setEditCommentContent}
            onReply={(id) => setReplyingTo(id)}
            onReplyCancel={() => {
              setReplyingTo(null);
              setReplyContent("");
            }}
            onReplyContentChange={setReplyContent}
            onSubmitReply={handleSubmitReply}
            onUpdate={handleUpdateComment}
            replies={commentReplies(comment._id)}
            replyContent={replyContent}
            replyingTo={replyingTo}
          />
        ))}
      </div>
    );
  };

  const renderDialogContent = () => {
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
        {renderFeedbackHeader()}
        {renderFeedbackContent()}
      </div>
    );
  };

  return (
    <>
      <Dialog onOpenChange={(open) => !open && onClose()} open={!!feedbackId}>
        <DialogContent className="max-w-2xl p-0">
          {renderDialogContent()}
        </DialogContent>
      </Dialog>

      {/* Delete Feedback Dialog */}
      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feedback? This action cannot
              be undone and will remove all associated comments and votes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Comment Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setCommentToDelete(null)}
        open={!!commentToDelete}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setCommentToDelete(null)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleDeleteComment} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Comment item component
interface CommentData {
  _id: string;
  body: string;
  createdAt: number;
  authorName?: string;
  authorImage?: string;
  isAuthor?: boolean;
  isOfficial?: boolean;
}

interface CommentItemProps {
  comment: CommentData;
  replies: CommentData[];
  isAdmin: boolean;
  replyingTo: string | null;
  replyContent: string;
  editingCommentId: string | null;
  editCommentContent: string;
  isSubmittingComment: boolean;
  onReply: (id: string) => void;
  onReplyCancel: () => void;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: (parentId: string) => Promise<void>;
  onEdit: (id: string, content: string) => void;
  onEditCancel: () => void;
  onEditContentChange: (content: string) => void;
  onUpdate: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}

function CommentItem({
  comment,
  replies,
  isAdmin,
  replyingTo,
  replyContent,
  editingCommentId,
  editCommentContent,
  isSubmittingComment,
  onReply,
  onReplyCancel,
  onReplyContentChange,
  onSubmitReply,
  onEdit,
  onEditCancel,
  onEditContentChange,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const canModify = comment.isAuthor || isAdmin;
  const isEditing = editingCommentId === comment._id;
  const isReplying = replyingTo === comment._id;

  return (
    <div className="group">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.authorImage} />
          <AvatarFallback>
            {comment.authorName?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {comment.authorName || "Anonymous"}
            </span>
            {comment.isOfficial && (
              <Badge className="text-xs" variant="secondary">
                Official
              </Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </span>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                autoFocus
                onChange={(e) => onEditContentChange(e.target.value)}
                rows={2}
                value={editCommentContent}
              />
              <div className="flex gap-2">
                <Button onClick={onEditCancel} size="sm" variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={!editCommentContent.trim()}
                  onClick={() => onUpdate(comment._id)}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>

              {/* Comment actions */}
              <div className="mt-2 flex items-center gap-2">
                <Button
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => onReply(comment._id)}
                  variant="link"
                >
                  Reply
                </Button>
                {canModify && (
                  <DropdownList>
                    <DropdownListTrigger>
                      <Button
                        className="h-auto p-0 text-muted-foreground opacity-0 group-hover:opacity-100"
                        variant="link"
                      >
                        <DotsThreeVertical className="h-4 w-4" />
                      </Button>
                    </DropdownListTrigger>
                    <DropdownListContent>
                      <DropdownListItem
                        onClick={() => onEdit(comment._id, comment.body)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownListItem>
                      <DropdownListItem
                        className="text-destructive"
                        onClick={() => onDelete(comment._id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownListItem>
                    </DropdownListContent>
                  </DropdownList>
                )}
              </div>
            </>
          )}

          {/* Reply input */}
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <Textarea
                autoFocus
                className="flex-1"
                onChange={(e) => onReplyContentChange(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                value={replyContent}
              />
              <div className="flex flex-col gap-1">
                <Button
                  disabled={!replyContent.trim() || isSubmittingComment}
                  onClick={() => onSubmitReply(comment._id)}
                  size="sm"
                >
                  Reply
                </Button>
                <Button onClick={onReplyCancel} size="sm" variant="ghost">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-4 space-y-3 border-l-2 pl-4">
              {replies.map((reply) => (
                <div className="group flex gap-3" key={reply._id}>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={reply.authorImage} />
                    <AvatarFallback className="text-xs">
                      {reply.authorName?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {reply.authorName || "Anonymous"}
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

                    {editingCommentId === reply._id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          autoFocus
                          onChange={(e) => onEditContentChange(e.target.value)}
                          rows={2}
                          value={editCommentContent}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={onEditCancel}
                            size="sm"
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={!editCommentContent.trim()}
                            onClick={() => onUpdate(reply._id)}
                            size="sm"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {reply.body}
                        </p>
                        {(reply.isAuthor || isAdmin) && (
                          <div className="mt-1">
                            <DropdownList>
                              <DropdownListTrigger>
                                <Button
                                  className="h-auto p-0 text-muted-foreground opacity-0 group-hover:opacity-100"
                                  variant="link"
                                >
                                  <DotsThreeVertical className="h-4 w-4" />
                                </Button>
                              </DropdownListTrigger>
                              <DropdownListContent>
                                <DropdownListItem
                                  onClick={() => onEdit(reply._id, reply.body)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownListItem>
                                <DropdownListItem
                                  className="text-destructive"
                                  onClick={() => onDelete(reply._id)}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownListItem>
                              </DropdownListContent>
                            </DropdownList>
                          </div>
                        )}
                      </>
                    )}
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
