"use client";

import { CalendarBlank, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useHotkeys } from "react-hotkeys-hook";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { CommentsSection } from "./comments-section";
import { FeedbackContent } from "./feedback-content";
import type {
  FeedbackDetailContentProps,
  FeedbackDetailDrawerProps,
  FeedbackListItem,
} from "./feedback-detail-drawer-types";
import { FeedbackMetadataBar } from "./feedback-metadata-bar";

const EMPTY_FEEDBACK_LIST: FeedbackListItem[] = [];
const EMPTY_FEEDBACK_IDS: Id<"feedback">[] = [];

export type {
  FeedbackDetailContentProps,
  FeedbackDetailDrawerProps,
  FeedbackListItem,
} from "./feedback-detail-drawer-types";

export function FeedbackDetailDrawer({
  feedbackId,
  isOpen,
  onClose,
  isAdmin = false,
  feedbackList = EMPTY_FEEDBACK_LIST,
  feedbackIds = EMPTY_FEEDBACK_IDS,
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
    (listItem && feedbackId
      ? {
          _id: feedbackId,
          title: listItem.title,
          description: listItem.description ?? null,
          tags: listItem.tags
            ?.filter((t): t is NonNullable<typeof t> => t !== null)
            .map((t) => ({
              _id: t._id,
              name: t.name,
              color: t.color,
            })),
          hasVoted: listItem.hasVoted,
          userVoteType: listItem.userVoteType,
          voteCount: listItem.voteCount,
          commentCount: listItem.commentCount,
          organizationStatusId: listItem.organizationStatusId,
          createdAt: listItem.createdAt,
          author: null, // Will load from full details
          assignee: null, // Will load from full details
          organizationId: listItem.organizationId,
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
        className="gap-0 overflow-hidden p-0 md:w-[70vw] md:max-w-[70vw]"
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

          {/* Metadata: Author & Date */}
          <div className="flex items-center gap-3">
            {/* Author */}
            {feedback?.author && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={feedback.author.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {feedback.author.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground text-xs">
                      {feedback.author.name ?? "Anonymous"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Posted by {feedback.author.name ?? "Anonymous"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Date */}
            {feedback?.createdAt && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <CalendarBlank className="h-3.5 w-3.5" />
                    <span>
                      {formatDistanceToNow(feedback.createdAt, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {new Date(feedback.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

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
          aiComplexity={feedback.aiComplexity}
          aiComplexityReasoning={feedback.aiComplexityReasoning}
          aiPriority={feedback.aiPriority}
          aiPriorityReasoning={feedback.aiPriorityReasoning}
          aiTimeEstimate={feedback.aiTimeEstimate}
          assignee={feedback.assignee}
          attachments={feedback.attachments}
          author={feedback.author}
          complexity={feedback.complexity}
          createdAt={feedback.createdAt}
          deadline={feedback.deadline}
          description={feedback.description}
          feedbackId={feedbackId}
          isAdmin={isAdmin}
          organizationId={feedback.organizationId}
          organizationStatusId={feedback.organizationStatusId}
          priority={feedback.priority}
          tags={feedback.tags}
          timeEstimate={feedback.timeEstimate}
          title={feedback.title}
          userVoteType={feedback.userVoteType ?? null}
          voteCount={feedback.voteCount ?? 0}
        />

        {/* Main content */}
        <div className="min-h-[60vh] px-6 py-4">
          <FeedbackContent
            attachments={feedback.attachments}
            description={feedback.description ?? ""}
            feedbackId={feedbackId}
            isAdmin={isAdmin}
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
