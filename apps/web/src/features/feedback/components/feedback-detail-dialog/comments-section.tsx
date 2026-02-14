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
  comments: CommentData[] | undefined;
  topLevelComments: CommentData[];
  commentReplies: (parentId: Id<"comments">) => CommentData[];
  effectiveIsAdmin: boolean;
  isGeneratingDraft: boolean;
  onGenerateDraftReply: () => void;
  newComment: string;
  onNewCommentChange: (content: string) => void;
  isSubmittingComment: boolean;
  onSubmitComment: () => void;
  editCommentContent: string;
  editingCommentId: Id<"comments"> | null;
  replyingTo: Id<"comments"> | null;
  replyContent: string;
  onDelete: (id: Id<"comments">) => void;
  onEdit: (id: Id<"comments">, content: string) => void;
  onEditCancel: () => void;
  onEditContentChange: (content: string) => void;
  onReply: (id: Id<"comments">) => void;
  onReplyCancel: () => void;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: (parentId: Id<"comments">) => Promise<void>;
  onUpdateComment: (id: Id<"comments">) => Promise<void>;
}

const renderLoadingSkeleton = () => (
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

const emptyState = (
  <p className="py-8 text-center text-muted-foreground">
    No comments yet. Be the first to comment!
  </p>
);

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
  const renderCommentsList = () => {
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
  };

  return (
    <div>
      <h3 className="mb-4 font-medium">Comments ({comments?.length || 0})</h3>

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
                  <ArrowsClockwise className="mr-1 h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkle className="mr-1 h-3 w-3" />
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
            className="self-end"
            disabled={!newComment.trim() || isSubmittingComment}
            onClick={onSubmitComment}
            size="icon"
          >
            <PaperPlaneRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {renderCommentsList()}
    </div>
  );
}
