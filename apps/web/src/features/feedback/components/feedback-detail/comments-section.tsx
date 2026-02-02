"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { CommentProvider } from "./comment-context";
import { CommentItem } from "./comment-item";
import type { CommentData } from "./types";

interface CommentsSectionProps {
  feedbackId: Id<"feedback">;
  currentUser?: {
    name?: string | null;
    image?: string | null;
  } | null;
}

export function CommentsSection({
  feedbackId,
  currentUser,
}: CommentsSectionProps) {
  const [activeTab, setActiveTab] = useState("comments");
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsData = useQuery(api.comments.list, { feedbackId });
  const addComment = useMutation(api.comments.create);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment({
        feedbackId,
        body: newComment.trim(),
      });
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  }, [feedbackId, newComment, isSubmitting, addComment]);

  // Transform comments to CommentData format with nested replies
  const comments = buildCommentTree(commentsData ?? []);

  return (
    <div className="space-y-4">
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="comments">
            Comments ({commentsData?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value="comments">
          {/* Comment Input */}
          <CommentInput
            currentUser={currentUser}
            isSubmitting={isSubmitting}
            onCommentChange={setNewComment}
            onSubmit={handleSubmitComment}
            value={newComment}
          />

          {/* Comments List */}
          <CommentProvider feedbackId={feedbackId}>
            <div className="mt-6 space-y-4">
              {comments.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <CommentItem comment={comment} key={comment.id} />
                ))
              )}
            </div>
          </CommentProvider>
        </TabsContent>

        <TabsContent className="mt-4" value="activity">
          <ActivityFeed feedbackId={feedbackId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface CommentInputProps {
  currentUser?: {
    name?: string | null;
    image?: string | null;
  } | null;
  value: string;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function CommentInput({
  currentUser,
  value,
  onCommentChange,
  onSubmit,
  isSubmitting,
}: CommentInputProps) {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={currentUser?.image ?? undefined} />
        <AvatarFallback className="text-xs">
          {currentUser?.name?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Textarea
          className="min-h-20"
          onChange={(e) => onCommentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              onSubmit();
            }
          }}
          placeholder="Write a comment..."
          value={value}
        />
        <div className="flex justify-end">
          <Button
            disabled={!value.trim() || isSubmitting}
            onClick={onSubmit}
            size="sm"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ActivityFeedProps {
  feedbackId: Id<"feedback">;
}

function ActivityFeed({ feedbackId: _feedbackId }: ActivityFeedProps) {
  // TODO: Implement activity feed with status changes, votes, etc.
  return (
    <div className="py-8 text-center text-muted-foreground">
      Activity feed coming soon...
    </div>
  );
}

// Helper function to build comment tree from flat list
interface RawComment {
  _id: Id<"comments">;
  body: string;
  createdAt: number;
  parentId?: Id<"comments">;
  author?: {
    name?: string;
    email: string;
    image?: string;
  };
}

function buildCommentTree(rawComments: RawComment[]): CommentData[] {
  const commentMap = new Map<string, CommentData>();
  const rootComments: CommentData[] = [];

  // First pass: create CommentData objects
  for (const comment of rawComments) {
    commentMap.set(comment._id, {
      id: comment._id,
      content: comment.body,
      createdAt: comment.createdAt,
      author: comment.author
        ? {
            name: comment.author.name,
            email: comment.author.email,
            image: comment.author.image,
          }
        : undefined,
      replies: [],
    });
  }

  // Second pass: build tree structure
  for (const comment of rawComments) {
    const commentData = commentMap.get(comment._id);
    if (!commentData) {
      continue;
    }

    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(commentData);
      }
    } else {
      rootComments.push(commentData);
    }
  }

  return rootComments;
}
