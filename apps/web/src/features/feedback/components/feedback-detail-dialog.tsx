"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";

import { AIClarification } from "./ai-clarification";
import { CommentsSection } from "./feedback-detail-dialog/comments-section";
import {
  DeleteCommentDialog,
  DeleteFeedbackDialog,
} from "./feedback-detail-dialog/delete-dialogs";
import { FeedbackHeader } from "./feedback-detail-dialog/feedback-header";
import { useAIDraftReply } from "./feedback-detail-dialog/use-ai-draft-reply";
import { useCommentEditing } from "./feedback-detail-dialog/use-comment-editing";
import { useFeedbackEditing } from "./feedback-detail-dialog/use-feedback-editing";
import { LinkedTasksSection } from "./linked-tasks-section";

interface FeedbackDetailDialogProps {
  feedbackId: Id<"feedback"> | null;
  isAdmin?: boolean;
  onClose: () => void;
}

function FeedbackLoadingState() {
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

function FeedbackNotFoundState() {
  return (
    <div className="p-6 text-center text-muted-foreground">
      Feedback not found
    </div>
  );
}

export function FeedbackDetailDialog({
  feedbackId,
  onClose,
  isAdmin = false,
}: FeedbackDetailDialogProps) {
  const feedback = useQuery(
    api.feedback.queries.get,
    feedbackId ? { id: feedbackId } : "skip"
  );
  const comments = useQuery(
    api.feedback.comments.list,
    feedbackId ? { feedbackId } : "skip"
  );

  // Query organization statuses
  const organizationStatuses = useQuery(
    api.organizations.statuses_queries.list,
    feedback?.organizationId
      ? { organizationId: feedback.organizationId }
      : "skip"
  );

  const effectiveStatuses = organizationStatuses ?? [];

  const updateFeedback = useMutation(api.feedback.mutations.update);
  const updateFeedbackStatus = useMutation(
    api.feedback.actions_manage.updateOrganizationStatus
  );
  const deleteFeedback = useMutation(api.feedback.actions_manage.remove);
  const toggleVote = useMutation(api.feedback.votes.toggle);
  const togglePin = useMutation(api.feedback.actions.togglePin);
  const createComment = useMutation(api.feedback.comments.create);
  const updateComment = useMutation(api.feedback.comments.update);
  const deleteComment = useMutation(api.feedback.comments.remove);

  // Feedback editing hook
  const {
    editedTitle,
    editedDescription,
    hasUnsavedChanges,
    handleTitleChange,
    handleDescriptionChange,
    handleSaveChanges,
    handleCancelChanges,
  } = useFeedbackEditing({ feedbackId, feedback, updateFeedback });

  // Comment editing hook
  const {
    newComment,
    setNewComment,
    replyingTo,
    setReplyingTo,
    replyContent,
    setReplyContent,
    editingCommentId,
    setEditingCommentId,
    editCommentContent,
    setEditCommentContent,
    isSubmittingComment,
    commentToDelete,
    setCommentToDelete,
    handleSubmitComment,
    handleSubmitReply,
    handleUpdateComment,
    handleDeleteComment,
  } = useCommentEditing({
    feedbackId,
    createComment,
    updateComment,
    deleteComment,
  });

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Use passed isAdmin prop if available, otherwise fall back to feedback role
  const effectiveIsAdmin =
    isAdmin || feedback?.role === "admin" || feedback?.role === "owner";
  const canEdit = feedback?.isAuthor || effectiveIsAdmin;

  // AI Draft Reply
  const { isGeneratingDraft, handleGenerateDraftReply } = useAIDraftReply({
    feedbackId,
    effectiveIsAdmin,
    setNewComment,
  });

  const handleVote = useCallback(async () => {
    if (!feedbackId) {
      return;
    }
    await toggleVote({ feedbackId, voteType: "upvote" });
  }, [feedbackId, toggleVote]);

  const handleTogglePin = useCallback(async () => {
    if (!feedbackId) {
      return;
    }
    await togglePin({ id: feedbackId });
  }, [feedbackId, togglePin]);

  const handleStatusChange = useCallback(
    async (statusId: Id<"organizationStatuses"> | null) => {
      if (!(feedbackId && statusId)) {
        return;
      }
      await updateFeedbackStatus({
        feedbackId,
        organizationStatusId: statusId,
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

  if (!feedbackId) {
    return null;
  }

  const isLoading = feedback === undefined;

  let dialogContent: ReactNode;

  if (isLoading) {
    dialogContent = <FeedbackLoadingState />;
  } else if (feedback === null) {
    dialogContent = <FeedbackNotFoundState />;
  } else {
    const currentStatus = effectiveStatuses.find(
      (status) => status._id === feedback.organizationStatusId
    );
    const topLevelComments =
      comments?.filter((comment) => !comment.parentId) ?? [];
    const commentReplies = (parentId: Id<"comments">) =>
      comments?.filter((comment) => comment.parentId === parentId) ?? [];

    const feedbackContent = (
      <div className="flex-1 overflow-y-auto p-6">
        {/* Description */}
        <div className="mb-6">
          <TiptapMarkdownEditor
            editable={canEdit}
            minimal
            onChange={handleDescriptionChange}
            placeholder={canEdit ? "Add a description..." : ""}
            value={editedDescription}
          />
        </div>

        {/* AI Clarification */}
        <AIClarification feedbackId={feedbackId} isAdmin={effectiveIsAdmin} />

        {/* Tags */}
        {feedback.tags && feedback.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 font-medium">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {feedback.tags.flatMap((tag) =>
                tag === null
                  ? []
                  : [
                      <Badge
                        className="font-normal"
                        color={tag.color}
                        key={tag._id}
                      >
                        {tag.icon && <span>{tag.icon}</span>}
                        {tag.name}
                      </Badge>,
                    ]
              )}
            </div>
          </div>
        )}

        {/* Linked Tasks */}
        {feedback.organizationId && (
          <div className="mb-6">
            <LinkedTasksSection
              feedbackId={feedbackId}
              isAdmin={effectiveIsAdmin}
              organizationId={feedback.organizationId}
            />
          </div>
        )}

        <Separator className="my-6" />

        {/* Comments section */}
        <CommentsSection
          commentReplies={commentReplies}
          comments={comments}
          editCommentContent={editCommentContent}
          editingCommentId={editingCommentId}
          effectiveIsAdmin={effectiveIsAdmin}
          isGeneratingDraft={isGeneratingDraft}
          isSubmittingComment={isSubmittingComment}
          newComment={newComment}
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
          onGenerateDraftReply={handleGenerateDraftReply}
          onNewCommentChange={setNewComment}
          onReply={(id) => setReplyingTo(id)}
          onReplyCancel={() => {
            setReplyingTo(null);
            setReplyContent("");
          }}
          onReplyContentChange={setReplyContent}
          onSubmitComment={handleSubmitComment}
          onSubmitReply={handleSubmitReply}
          onUpdateComment={handleUpdateComment}
          replyContent={replyContent}
          replyingTo={replyingTo}
          topLevelComments={topLevelComments}
        />
      </div>
    );

    dialogContent = (
      <div className="flex max-h-[90vh] flex-col">
        <FeedbackHeader
          canEdit={canEdit}
          currentStatus={currentStatus}
          editedTitle={editedTitle}
          effectiveIsAdmin={effectiveIsAdmin}
          effectiveStatuses={effectiveStatuses}
          feedback={feedback}
          hasUnsavedChanges={hasUnsavedChanges}
          onCancelChanges={handleCancelChanges}
          onDeleteClick={() => setShowDeleteDialog(true)}
          onSaveChanges={handleSaveChanges}
          onStatusChange={handleStatusChange}
          onTitleChange={handleTitleChange}
          onTogglePin={handleTogglePin}
          onVote={handleVote}
        />
        {feedbackContent}
      </div>
    );
  }

  return (
    <>
      <Dialog onOpenChange={(open) => !open && onClose()} open={!!feedbackId}>
        <DialogContent className="max-w-2xl p-0">{dialogContent}</DialogContent>
      </Dialog>

      <DeleteFeedbackDialog
        onDelete={handleDelete}
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
      />

      <DeleteCommentDialog
        onDelete={handleDeleteComment}
        onOpenChange={(open) => !open && setCommentToDelete(null)}
        open={!!commentToDelete}
      />
    </>
  );
}
