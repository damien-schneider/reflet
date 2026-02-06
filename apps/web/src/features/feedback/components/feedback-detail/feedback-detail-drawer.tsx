"use client";

import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

import { CommentsSection } from "./comments-section";
import { FeedbackContent } from "./feedback-content";
import { FeedbackMetadataBar } from "./feedback-metadata-bar";

// Minimal feedback data from the list (for instant display)
export interface FeedbackListItem {
  _id: string;
  title: string;
  description?: string;
  voteCount: number;
  commentCount: number;
  createdAt: number;
  organizationStatusId?: string;
  hasVoted?: boolean;
  userVoteType?: "upvote" | "downvote" | null;
  organizationId: string;
  tags?: Array<{
    _id: string;
    name: string;
    color: string;
    icon?: string;
  } | null>;
}

export interface FeedbackDetailDrawerProps {
  feedbackId: Id<"feedback"> | null;
  isOpen: boolean;
  onClose: () => void;
  isMember?: boolean;
  isAdmin?: boolean;
  // Initial data from the list for instant display
  feedbackList?: FeedbackListItem[];
  // Navigation
  feedbackIds?: Id<"feedback">[];
  currentIndex?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function FeedbackDetailDrawer({
  feedbackId,
  isOpen,
  onClose,
  isMember: _isMember = false,
  isAdmin = false,
  feedbackList = [],
  feedbackIds = [],
  currentIndex = -1,
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
}: FeedbackDetailDrawerProps) {
  // Fetch full details (includes author, assignee)
  const feedbackDetails = useQuery(
    api.feedback.get,
    feedbackId ? { id: feedbackId } : "skip"
  );

  // Find initial data from list for instant display
  const listItem = feedbackId
    ? feedbackList.find((f) => f._id === feedbackId)
    : null;

  // Merge: use full details if available, otherwise use list data
  const feedback =
    feedbackDetails ??
    (listItem
      ? {
          _id: feedbackId as Id<"feedback">,
          title: listItem.title,
          description: listItem.description ?? null,
          tags: listItem.tags
            ?.filter((t): t is NonNullable<typeof t> => t !== null)
            .map((t) => ({
              _id: t._id as Id<"tags">,
              name: t.name,
              color: t.color,
            })),
          hasVoted: listItem.hasVoted,
          userVoteType: listItem.userVoteType,
          voteCount: listItem.voteCount,
          commentCount: listItem.commentCount,
          organizationStatusId: listItem.organizationStatusId as
            | Id<"organizationStatuses">
            | undefined,
          createdAt: listItem.createdAt,
          author: null, // Will load from full details
          assignee: null, // Will load from full details
          organizationId: listItem.organizationId as Id<"organizations">,
        }
      : null);

  // Keyboard shortcuts for navigation
  useHotkeys(
    "j",
    () => {
      if (isOpen && hasNext && onNext) {
        onNext();
      }
    },
    { enabled: isOpen && hasNext },
    [isOpen, hasNext, onNext]
  );

  useHotkeys(
    "k",
    () => {
      if (isOpen && hasPrevious && onPrevious) {
        onPrevious();
      }
    },
    { enabled: isOpen && hasPrevious },
    [isOpen, hasPrevious, onPrevious]
  );

  useHotkeys(
    "ArrowDown",
    () => {
      if (isOpen && hasNext && onNext) {
        onNext();
      }
    },
    { enabled: isOpen && hasNext },
    [isOpen, hasNext, onNext]
  );

  useHotkeys(
    "ArrowUp",
    () => {
      if (isOpen && hasPrevious && onPrevious) {
        onPrevious();
      }
    },
    { enabled: isOpen && hasPrevious },
    [isOpen, hasPrevious, onPrevious]
  );

  const showNavigation = feedbackIds.length > 1;
  // Only show loading if we have no data at all (not even from the list)
  const isLoading = feedbackId && !feedback;

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent
        className="gap-0 overflow-hidden p-0 md:w-[60vw] md:max-w-5xl"
        showCloseButton={false}
        side="right"
        variant="panel"
      >
        {/* Header */}
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <SheetTitle className="sr-only">Feedback Details</SheetTitle>
          <SheetDescription className="sr-only">
            View and manage feedback details
          </SheetDescription>

          {/* Navigation controls */}
          <div className="flex items-center gap-1">
            {showNavigation && (
              <>
                <Button
                  disabled={!hasPrevious}
                  onClick={onPrevious}
                  size="icon-sm"
                  title="Previous (k or Up arrow)"
                  variant="ghost"
                >
                  <CaretLeft className="h-4 w-4" />
                  <span className="sr-only">Previous feedback</span>
                </Button>
                <span className="min-w-12 text-center text-muted-foreground text-xs tabular-nums">
                  {currentIndex >= 0 ? currentIndex + 1 : "-"} /{" "}
                  {feedbackIds.length}
                </span>
                <Button
                  disabled={!hasNext}
                  onClick={onNext}
                  size="icon-sm"
                  title="Next (j or Down arrow)"
                  variant="ghost"
                >
                  <CaretRight className="h-4 w-4" />
                  <span className="sr-only">Next feedback</span>
                </Button>
              </>
            )}
          </div>

          {/* Close button */}
          <SheetClose
            render={<Button onClick={onClose} size="icon-sm" variant="ghost" />}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </SheetHeader>

        {/* Content */}
        <FeedbackDetailContent
          feedback={feedback}
          feedbackId={feedbackId}
          isAdmin={isAdmin}
          isLoading={isLoading}
        />
      </SheetContent>
    </Sheet>
  );
}

interface FeedbackDetailContentProps {
  isLoading: boolean | null;
  feedback:
    | {
        _id: Id<"feedback">;
        title: string;
        description: string | null;
        tags?: Array<{
          _id: Id<"tags">;
          name: string;
          color: string;
        } | null>;
        hasVoted?: boolean;
        userVoteType?: "upvote" | "downvote" | null;
        voteCount?: number;
        commentCount?: number;
        organizationStatusId?: Id<"organizationStatuses"> | null;
        createdAt: number;
        author?: {
          name?: string | null;
          email?: string;
          image?: string | null;
        } | null;
        assignee?: {
          id: string;
          name?: string | null;
          email?: string;
          image?: string | null;
        } | null;
        organizationId: Id<"organizations">;
      }
    | null
    | undefined;
  feedbackId: Id<"feedback"> | null;
  isAdmin: boolean;
}

function FeedbackDetailContent({
  isLoading,
  feedback,
  feedbackId,
  isAdmin,
}: FeedbackDetailContentProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!(feedback && feedbackId)) {
    return null;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col">
        {/* Metadata bar */}
        <FeedbackMetadataBar
          author={feedback.author}
          createdAt={feedback.createdAt}
          feedbackId={feedbackId}
          isAdmin={isAdmin}
          organizationId={feedback.organizationId}
          organizationStatusId={feedback.organizationStatusId}
          userVoteType={feedback.userVoteType ?? null}
          voteCount={feedback.voteCount ?? 0}
        />

        {/* Main content */}
        <div className="min-h-[60vh] px-6 py-4">
          <FeedbackContent
            description={feedback.description ?? ""}
            feedbackId={feedbackId}
            isAdmin={isAdmin}
            tags={feedback.tags}
            title={feedback.title}
          />
        </div>

        {/* Comments */}
        <div className="border-t px-6 py-6">
          <CommentsSection
            currentUser={feedback.author}
            feedbackId={feedbackId}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
