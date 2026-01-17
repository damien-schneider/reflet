import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CommentItem } from "@/features/feedback/components/feedback-comment-item";
import { FeedbackDetailDialogs } from "@/features/feedback/components/feedback-detail-dialogs";
import { FeedbackDetailSidebar } from "@/features/feedback/components/feedback-detail-sidebar";
import { FeedbackMainContent } from "@/features/feedback/components/feedback-main-content";

export const Route = createFileRoute(
  "/dashboard/$orgSlug/boards/$boardSlug/feedback/$feedbackId"
)({
  component: FeedbackDetailPage,
});

function FeedbackDetailPage() {
  const { orgSlug, boardSlug, feedbackId } = Route.useParams();
  const navigate = useNavigate();

  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const board = useQuery(
    api.boards.getBySlug,
    org?._id
      ? {
          organizationId: org._id as Id<"organizations">,
          slug: boardSlug,
        }
      : "skip"
  );
  const feedback = useQuery(api.feedback.get, {
    id: feedbackId as Id<"feedback">,
  });
  const comments = useQuery(api.comments.list, {
    feedbackId: feedbackId as Id<"feedback">,
  });
  const tags = useQuery(
    api.tag_manager.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const toggleVote = useMutation(api.votes.toggle);
  const togglePin = useMutation(api.feedback_actions.togglePin);
  const deleteFeedback = useMutation(api.feedback_actions.remove);
  const updateFeedback = useMutation(api.feedback.update);
  const addTag = useMutation(api.feedback_actions.addTag);
  const removeTag = useMutation(api.feedback_actions.removeTag);
  const createComment = useMutation(api.comments.create);
  const deleteComment = useMutation(api.comments.remove);

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");

  const handleToggleVote = async () => {
    if (!feedback) {
      return;
    }
    try {
      await toggleVote({ feedbackId: feedback._id as Id<"feedback"> });
    } catch (error) {
      console.error("Failed to toggle vote:", error);
    }
  };

  const handleTogglePin = async () => {
    if (!feedback) {
      return;
    }
    try {
      await togglePin({ id: feedback._id as Id<"feedback"> });
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!feedback) {
      return;
    }
    try {
      await deleteFeedback({ id: feedback._id as Id<"feedback"> });
      navigate({
        to: "/dashboard/$orgSlug/boards/$boardSlug",
        params: { orgSlug, boardSlug },
      });
    } catch (error) {
      console.error("Failed to delete feedback:", error);
    }
  };

  const handleSaveDescription = async () => {
    if (!feedback) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateFeedback({
        id: feedback._id as Id<"feedback">,
        description: editedDescription,
      });
      setIsEditingDescription(false);
    } catch (error) {
      console.error("Failed to update description:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = async (tagId: string | null) => {
    if (!tagId) {
      return;
    }
    if (!feedback) {
      return;
    }
    try {
      await addTag({
        feedbackId: feedback._id as Id<"feedback">,
        tagId: tagId as Id<"tags">,
      });
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!feedback) {
      return;
    }
    try {
      await removeTag({
        feedbackId: feedback._id as Id<"feedback">,
        tagId: tagId as Id<"tags">,
      });
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!(newComment.trim() && feedback)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createComment({
        feedbackId: feedback._id as Id<"feedback">,
        body: newComment.trim(),
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!(replyContent.trim() && feedback)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createComment({
        feedbackId: feedback._id as Id<"feedback">,
        body: replyContent.trim(),
        parentId: parentId as Id<"comments">,
      });
      setReplyContent("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to create reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) {
      return;
    }
    try {
      await deleteComment({ id: commentToDelete as Id<"comments"> });
      setCommentToDelete(null);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  if (!(org && board && feedback)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const isAdmin = org.role === "owner" || org.role === "admin";
  const feedbackTags = feedback.tags?.filter(Boolean) || [];
  const availableTags = tags?.filter(
    (t) => !feedbackTags.some((ft) => ft?._id === t._id)
  );

  // Build comment tree
  const rootComments = comments?.filter((c) => !c.parentId) || [];
  const commentReplies = (parentId: string) =>
    comments?.filter((c) => c.parentId === parentId) || [];

  return (
    <div className="p-6">
      {/* Back button */}
      <Link
        className="mb-4 inline-flex h-8 shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-none border border-transparent bg-clip-padding px-2.5 font-medium text-xs outline-none transition-all hover:bg-muted hover:text-foreground"
        params={{ orgSlug, boardSlug }}
        to="/dashboard/$orgSlug/boards/$boardSlug"
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to {board.name}
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <FeedbackMainContent
            editedDescription={editedDescription}
            feedback={feedback}
            handleDeleteFeedback={() => setShowDeleteDialog(true)}
            handleSaveDescription={handleSaveDescription}
            handleTogglePin={handleTogglePin}
            handleToggleVote={handleToggleVote}
            isAdmin={isAdmin}
            isEditingDescription={isEditingDescription}
            isSubmitting={isSubmitting}
            setEditedDescription={setEditedDescription}
            setIsEditingDescription={setIsEditingDescription}
          >
            <Separator className="my-6" />

            {/* Comments section */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-lg">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments?.length || 0})
              </h2>

              {/* New comment form */}
              <div className="mb-6 flex gap-2">
                <Textarea
                  className="flex-1"
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  value={newComment}
                />
                <Button
                  disabled={!newComment.trim() || isSubmitting}
                  onClick={handleSubmitComment}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments list */}
              <div className="space-y-4">
                {rootComments.map((comment) => (
                  <CommentItem
                    comment={comment}
                    isAdmin={isAdmin}
                    isSubmitting={isSubmitting}
                    key={comment._id}
                    onDeleteComment={setCommentToDelete}
                    onSubmitReply={handleSubmitReply}
                    replies={commentReplies(comment._id)}
                    replyContent={replyContent}
                    replyingTo={replyingTo}
                    setReplyContent={setReplyContent}
                    setReplyingTo={setReplyingTo}
                  />
                ))}
                {rootComments.length === 0 && (
                  <p className="text-center text-muted-foreground">
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            </div>
          </FeedbackMainContent>
        </div>

        {/* Sidebar */}
        <FeedbackDetailSidebar
          availableTags={availableTags}
          commentsCount={comments?.length || 0}
          feedback={feedback}
          feedbackTags={feedbackTags}
          handleAddTag={handleAddTag}
          handleRemoveTag={handleRemoveTag}
          isAdmin={isAdmin}
        />
      </div>

      <FeedbackDetailDialogs
        commentToDelete={commentToDelete}
        handleDeleteComment={handleDeleteComment}
        handleDeleteFeedback={handleDeleteFeedback}
        setCommentToDelete={setCommentToDelete}
        setShowDeleteDialog={setShowDeleteDialog}
        showDeleteDialog={showDeleteDialog}
      />
    </div>
  );
}
