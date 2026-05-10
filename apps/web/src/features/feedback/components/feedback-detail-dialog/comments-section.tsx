"use client";

import {
  ArrowsClockwise,
  PaperPlaneRight,
  Sparkle,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";

import type { CommentData } from "./comment-item";
import { CommentItem } from "./comment-item";

interface CommentsSectionProps {
  commentReplies: (parentId: Id<"comments">) => CommentData[];
  comments: CommentData[] | undefined;
  editCommentContent: string;
  editingCommentId: Id<"comments"> | null;
  effectiveIsAdmin: boolean;
  isGeneratingDraft: boolean;
  isSubmittingComment: boolean;
  newComment: string;
  onDelete: (id: Id<"comments">) => void;
  onEdit: (id: Id<"comments">, content: string) => void;
  onEditCancel: () => void;
  onEditContentChange: (content: string) => void;
  onGenerateDraftReply: () => void;
  onNewCommentChange: (content: string) => void;
  onReply: (id: Id<"comments">) => void;
  onReplyCancel: () => void;
  onReplyContentChange: (content: string) => void;
  onSubmitComment: () => void;
  onSubmitReply: (parentId: Id<"comments">) => Promise<void>;
  onUpdateComment: (id: Id<"comments">) => Promise<void>;
  replyContent: string;
  replyingTo: Id<"comments"> | null;
  topLevelComments: CommentData[];
}

interface CommentsListProps {
  commentReplies: (parentId: Id<"comments">) => CommentData[];
  comments: CommentData[] | undefined;
  editCommentContent: string;
  editingCommentId: Id<"comments"> | null;
  effectiveIsAdmin: boolean;
  isSubmittingComment: boolean;
  onDelete: (id: Id<"comments">) => void;
  onEdit: (id: Id<"comments">, content: string) => void;
  onEditCancel: () => void;
  onEditContentChange: (content: string) => void;
  onReply: (id: Id<"comments">) => void;
  onReplyCancel: () => void;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: (parentId: Id<"comments">) => Promise<void>;
  onUpdateComment: (id: Id<"comments">) => Promise<void>;
  replyContent: string;
  replyingTo: Id<"comments"> | null;
  topLevelComments: CommentData[];
}

const COMMENT_SKELETON_IDS = ["first", "second"];

const renderLoadingSkeleton = () => (
  <div className="space-y-4">
    {COMMENT_SKELETON_IDS.map((id) => (
      <div className="flex gap-3" key={id}>
        <Skeleton className="size-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    ))}
  </div>
);

const emptyState = (
  <p className="py-8 text-center text-muted-foreground">
    No comments yet. Be the first to comment!
  </p>
);

function CommentsList({
  comments,
  topLevelComments,
  commentReplies,
  editCommentContent,
  editingCommentId,
  effectiveIsAdmin,
  isSubmittingComment,
  onDelete,
  onEdit,
  onEditCancel,
  onEditContentChange,
  onReply,
  onReplyCancel,
  onReplyContentChange,
  onSubmitReply,
  onUpdateComment,
  replyContent,
  replyingTo,
}: CommentsListProps) {
  if (comments === undefined) {
    return renderLoadingSkeleton();
  }

  if (topLevelComments.length === 0) {
    return emptyState;
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
          onDelete={onDelete}
          onEdit={onEdit}
          onEditCancel={onEditCancel}
          onEditContentChange={onEditContentChange}
          onReply={onReply}
          onReplyCancel={onReplyCancel}
          onReplyContentChange={onReplyContentChange}
          onSubmitReply={onSubmitReply}
          onUpdate={onUpdateComment}
          replies={commentReplies(comment._id)}
          replyContent={replyContent}
          replyingTo={replyingTo}
        />
      ))}
    </div>
  );
}

export function CommentsSection({
  comments,
  topLevelComments,
  commentReplies,
  effectiveIsAdmin,
  isGeneratingDraft,
  onGenerateDraftReply,
  newComment,
  onNewCommentChange,
  isSubmittingComment,
  onSubmitComment,
  editCommentContent,
  editingCommentId,
  replyingTo,
  replyContent,
  onDelete,
  onEdit,
  onEditCancel,
  onEditContentChange,
  onReply,
  onReplyCancel,
  onReplyContentChange,
  onSubmitReply,
  onUpdateComment,
}: CommentsSectionProps) {
  return (
    <div>
      <h3 className="mb-4 font-medium">Comments ({comments?.length ?? 0})</h3>

      {/* Comment input */}
      <div className="mb-6 space-y-2">
        {effectiveIsAdmin && (
          <div className="flex justify-end">
            <Button
              disabled={isGeneratingDraft}
              onClick={onGenerateDraftReply}
              size="sm"
              variant="outline"
            >
              {isGeneratingDraft ? (
                <>
                  <ArrowsClockwise className="mr-1 size-3 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkle className="mr-1 size-3" />
                  Draft Reply with AI
                </>
              )}
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <TiptapMarkdownEditor
            className="flex-1"
            minimal
            onChange={onNewCommentChange}
            placeholder="Write a comment..."
            value={newComment}
          />
          <Button
            aria-label="Post comment"
            className="self-end"
            disabled={!newComment.trim() || isSubmittingComment}
            onClick={onSubmitComment}
            size="icon"
          >
            <PaperPlaneRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <CommentsList
        commentReplies={commentReplies}
        comments={comments}
        editCommentContent={editCommentContent}
        editingCommentId={editingCommentId}
        effectiveIsAdmin={effectiveIsAdmin}
        isSubmittingComment={isSubmittingComment}
        onDelete={onDelete}
        onEdit={onEdit}
        onEditCancel={onEditCancel}
        onEditContentChange={onEditContentChange}
        onReply={onReply}
        onReplyCancel={onReplyCancel}
        onReplyContentChange={onReplyContentChange}
        onSubmitReply={onSubmitReply}
        onUpdateComment={onUpdateComment}
        replyContent={replyContent}
        replyingTo={replyingTo}
        topLevelComments={topLevelComments}
      />
    </div>
  );
}
