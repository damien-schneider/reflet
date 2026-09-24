"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import { Button } from "@ctrl-ui/react/ui/button";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ctrl-ui/react/ui/sheet";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { CalendarBlank, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useHotkeys } from "react-hotkeys-hook";
import { ScreenshotGallery } from "../screenshot-gallery";
import { CommentsSection } from "./comments-section";
import { isCompositeWidgetFocused } from "./composite-widget-focus";
import { FeatureCheck } from "./feature-check";
import { FeedbackContent } from "./feedback-content";
import type {
  FeedbackDetailContentProps,
  FeedbackDetailDrawerProps,
  FeedbackListItem,
} from "./feedback-detail-drawer-types";
import { FeedbackMetadataBar } from "./feedback-metadata-bar";
import { InlineClarification } from "./inline-clarification";
import { ReportContext } from "./report-context";

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
  const feedbackDetails = useQuery(
    api.feedback.queries.get,
    feedbackId ? { id: feedbackId } : "skip"
  );

  const listItem = feedbackId
    ? feedbackList.find((f) => f._id === feedbackId)
    : null;

  const feedback =
    feedbackDetails ??
    (listItem && feedbackId
      ? {
          _id: feedbackId,
          assignee: null,
          author: null,
          commentCount: listItem.commentCount,
          createdAt: listItem.createdAt,
          description: listItem.description ?? null,
          hasVoted: listItem.hasVoted,
          isInternal: listItem.isInternal,
          organizationId: listItem.organizationId,
          organizationStatusId: listItem.organizationStatusId,
          tags: listItem.tags
            ?.filter((t): t is NonNullable<typeof t> => t !== null)
            .map((t) => ({
              _id: t._id,
              color: t.color,
              name: t.name,
            })),
          title: listItem.title,
          userVoteType: listItem.userVoteType,
          voteCount: listItem.voteCount,
        }
      : null);

  useHotkeys(
    "j",
    () => {
      if (!isCompositeWidgetFocused()) {
        onNext?.();
      }
    },
    { enabled: isOpen && hasNext },
    [isOpen, hasNext, onNext]
  );

  useHotkeys(
    "k",
    () => {
      if (!isCompositeWidgetFocused()) {
        onPrevious?.();
      }
    },
    { enabled: isOpen && hasPrevious },
    [isOpen, hasPrevious, onPrevious]
  );

  useHotkeys(
    "ArrowDown",
    () => {
      if (!isCompositeWidgetFocused()) {
        onNext?.();
      }
    },
    { enabled: isOpen && hasNext },
    [isOpen, hasNext, onNext]
  );

  useHotkeys(
    "ArrowUp",
    () => {
      if (!isCompositeWidgetFocused()) {
        onPrevious?.();
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
        className="gap-0 overflow-hidden p-0 md:w-[70vw] md:max-w-[70vw]"
        side="right"
      >
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <SheetTitle className="sr-only">Feedback Details</SheetTitle>
          <SheetDescription className="sr-only">
            View and manage feedback details
          </SheetDescription>

          <div className="flex items-center gap-3">
            {feedback?.author && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={feedback.author.image ?? undefined} />
                  <AvatarFallback className="text-micro">
                    {feedback.author.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground text-xs">
                  <span className="sr-only">Posted by </span>
                  {feedback.author.name ?? "Anonymous"}
                </span>
              </div>
            )}

            {feedback?.createdAt && (
              <time
                className="flex items-center gap-1 text-muted-foreground text-xs"
                dateTime={new Date(feedback.createdAt).toISOString()}
              >
                <CalendarBlank className="h-3.5 w-3.5" />
                {formatDistanceToNow(feedback.createdAt, {
                  addSuffix: true,
                })}
                <span className="sr-only">
                  {new Date(feedback.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </time>
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            {showNavigation && (
              <>
                <Tooltip>
                  <TooltipTrigger
                    aria-label="Previous feedback"
                    render={
                      <Button
                        disabled={!hasPrevious}
                        iconOnly
                        onClick={onPrevious}
                        size="xs"
                        variant="ghost"
                      />
                    }
                  >
                    <CaretLeft className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Previous (k or arrow up)</TooltipContent>
                </Tooltip>
                <span className="min-w-12 text-center text-muted-foreground text-xs tabular-nums">
                  {currentIndex >= 0 ? currentIndex + 1 : "-"} /{" "}
                  {feedbackIds.length}
                </span>
                <Tooltip>
                  <TooltipTrigger
                    aria-label="Next feedback"
                    render={
                      <Button
                        disabled={!hasNext}
                        iconOnly
                        onClick={onNext}
                        size="xs"
                        variant="ghost"
                      />
                    }
                  >
                    <CaretRight className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Next (j or arrow down)</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          <SheetClose
            render={
              <Button iconOnly onClick={onClose} size="xs" variant="ghost" />
            }
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </SheetHeader>

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
        <FeedbackMetadataBar
          aiComplexity={feedback.aiComplexity}
          aiComplexityReasoning={feedback.aiComplexityReasoning}
          aiNeedsReview={feedback.aiNeedsReview}
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
          isInternal={feedback.isInternal}
          organizationId={feedback.organizationId}
          organizationStatusId={feedback.organizationStatusId}
          priority={feedback.priority}
          tags={feedback.tags}
          timeEstimate={feedback.timeEstimate}
          title={feedback.title}
          userVoteType={feedback.userVoteType ?? null}
          voteCount={feedback.voteCount ?? 0}
        />

        <div className="min-h-[60vh] px-6 py-4">
          <FeedbackContent
            attachments={feedback.attachments}
            description={feedback.description ?? ""}
            feedbackId={feedbackId}
            isAdmin={isAdmin}
            title={feedback.title}
          />
        </div>

        {isAdmin && (
          <div className="px-6 pb-4">
            <InlineClarification feedbackId={feedbackId} />
          </div>
        )}

        {isAdmin && (
          <div className="px-6 pb-4">
            <FeatureCheck
              feedbackId={feedbackId}
              organizationId={feedback.organizationId}
            />
          </div>
        )}

        <div className="border-t px-6 py-4">
          <ScreenshotGallery feedbackId={feedbackId} />
        </div>

        {isAdmin && (
          <div className="border-t px-6 py-4">
            <ReportContext feedbackId={feedbackId} />
          </div>
        )}

        <div className="border-t px-6 py-6">
          <CommentsSection feedbackId={feedbackId} isAdmin={isAdmin} />
        </div>
      </div>
    </ScrollArea>
  );
}
