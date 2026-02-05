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
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

import { CommentsSection } from "./comments-section";
import { FeedbackContent } from "./feedback-content";
import { FeedbackMetadataBar } from "./feedback-metadata-bar";

export interface FeedbackDetailDrawerProps {
  feedbackId: Id<"feedback"> | null;
  isOpen: boolean;
  onClose: () => void;
  isMember?: boolean;
  isAdmin?: boolean;
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
  feedbackIds = [],
  currentIndex = -1,
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
}: FeedbackDetailDrawerProps) {
  const feedback = useQuery(
    api.feedback.get,
    feedbackId ? { id: feedbackId } : "skip"
  );

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
  const isLoading = feedbackId && !feedback;

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent
        className="flex w-full flex-col gap-0 overflow-hidden p-0 md:w-[60vw] md:max-w-3xl"
        showCloseButton={false}
        side="right"
        variant="floating"
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
          <Button onClick={onClose} size="icon-sm" variant="ghost">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </SheetHeader>

        {/* Content */}
        <DrawerBody
          feedback={feedback}
          feedbackId={feedbackId}
          isAdmin={isAdmin}
          isLoading={isLoading}
        />
      </SheetContent>
    </Sheet>
  );
}

interface DrawerBodyProps {
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

function DrawerBody({
  isLoading,
  feedback,
  feedbackId,
  isAdmin,
}: DrawerBodyProps) {
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
          hasVoted={feedback.hasVoted ?? false}
          isAdmin={isAdmin}
          organizationId={feedback.organizationId}
          organizationStatusId={feedback.organizationStatusId}
          voteCount={feedback.voteCount ?? 0}
        />

        {/* Main content */}
        <div className="px-6 py-4">
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
