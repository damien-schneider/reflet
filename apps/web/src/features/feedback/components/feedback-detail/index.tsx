"use client";

import { X } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { CommentsSection } from "./comments-section";
import { FeedbackHeader } from "./feedback-header";
import { FeedbackSidebar } from "./feedback-sidebar";
import { ImportanceVoting } from "./importance-voting";
import { SimilarPosts } from "./similar-posts";

export interface FeedbackDetailDialogProps {
  feedbackId: Id<"feedback"> | null;
  onClose: () => void;
  boardId?: Id<"boards">;
  isMember?: boolean;
  isAdmin?: boolean;
}

export function FeedbackDetailDialog({
  feedbackId,
  onClose,
  boardId: _boardId,
  isMember: _isMember = false,
  isAdmin = false,
}: FeedbackDetailDialogProps) {
  const isOpen = feedbackId !== null;
  const feedback = useQuery(
    api.feedback.get,
    feedbackId ? { id: feedbackId } : "skip"
  );

  // TODO: Implement similar posts query
  const similarPosts: Array<{
    _id: Id<"feedback">;
    title: string;
    voteCount: number;
  }> = [];

  const handleSimilarPostClick = (postId: Id<"feedback">) => {
    // TODO: Navigate to similar post or open in new dialog
    console.info("Navigate to post:", postId);
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="flex h-[90vh] max-h-225 max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <DialogTitle className="sr-only">Feedback Details</DialogTitle>
          <Button onClick={onClose} size="icon" variant="ghost">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        {feedback && feedbackId ? (
          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            {/* Main Content */}
            <ScrollArea className="flex-1">
              <div className="space-y-6 p-6">
                <FeedbackHeader
                  description={feedback.description ?? ""}
                  feedbackId={feedbackId}
                  isAdmin={isAdmin}
                  tags={feedback.tags}
                  title={feedback.title}
                />

                <ImportanceVoting feedbackId={feedbackId} />

                <SimilarPosts
                  onPostClick={handleSimilarPostClick}
                  posts={similarPosts}
                />

                <Separator />

                <CommentsSection
                  currentUser={feedback.author}
                  feedbackId={feedbackId}
                />
              </div>
            </ScrollArea>

            {/* Sidebar */}
            <FeedbackSidebar
              feedback={{
                hasVoted: feedback.hasVoted ?? false,
                voteCount: feedback.voteCount ?? 0,
                statusId: feedback.statusId,
                boardId: feedback.boardId,
                board: feedback.board,
                createdAt: feedback.createdAt,
                author: feedback.author,
              }}
              feedbackId={feedbackId}
              isAdmin={isAdmin}
            />
          </div>
        ) : (
          <FeedbackDetailSkeleton />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FeedbackDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <div className="flex-1 space-y-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="w-80 space-y-6 border-l p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </div>
  );
}

// Export for backward compatibility
export { FeedbackDetailDialog as FeaturebaseFeedbackDetail };
