"use client";

import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Sheet, SheetContent } from "@ctrl-ui/react/ui/sheet";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { ScreenshotGallery } from "../screenshot-gallery";
import { CommentsSection } from "./comments-section";
import { FeatureCheck } from "./feature-check";
import { FeedbackContent } from "./feedback-content";
import { FeedbackDetailDrawerHeader } from "./feedback-detail-drawer-header";
import type {
  FeedbackDetailContentProps,
  FeedbackDetailDrawerProps,
} from "./feedback-detail-drawer-types";
import { FeedbackMetadataBar } from "./feedback-metadata-bar";
import { InlineClarification } from "./inline-clarification";
import { ReportContext } from "./report-context";
import {
  useDrawerFeedback,
  useDrawerNavigationHotkeys,
} from "./use-feedback-detail-drawer";

const EMPTY_FEEDBACK_IDS: Id<"feedback">[] = [];

export type {
  FeedbackDetailContentProps,
  FeedbackDetailDrawerProps,
} from "./feedback-detail-drawer-types";

export function FeedbackDetailDrawer({
  feedbackId,
  isOpen,
  onClose,
  isAdmin = false,
  feedbackIds = EMPTY_FEEDBACK_IDS,
  currentIndex = -1,
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
}: FeedbackDetailDrawerProps) {
  const feedback = useDrawerFeedback(feedbackId);

  useDrawerNavigationHotkeys({
    hasNext,
    hasPrevious,
    isOpen,
    onNext,
    onPrevious,
  });

  const isLoading = feedbackId && !feedback;

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent
        className="gap-0 overflow-hidden p-0 md:w-[70vw] md:max-w-[70vw]"
        side="right"
      >
        <FeedbackDetailDrawerHeader
          author={feedback?.author}
          createdAt={feedback?.createdAt}
          currentIndex={currentIndex}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onNext={onNext}
          onPrevious={onPrevious}
          showNavigation={feedbackIds.length > 1}
          title={feedback?.title}
          total={feedbackIds.length}
        />

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

type LoadedFeedback = NonNullable<FeedbackDetailContentProps["feedback"]>;

interface LoadedFeedbackProps {
  feedback: LoadedFeedback;
  feedbackId: Id<"feedback">;
  isAdmin: boolean;
}

function FeedbackDetailSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4 px-6 py-5">
      <span className="sr-only">Loading feedback…</span>
      <Skeleton className="h-7 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

function FeedbackDetailMetadata({ feedback, isAdmin }: LoadedFeedbackProps) {
  return <FeedbackMetadataBar feedback={feedback} isAdmin={isAdmin} />;
}

function FeedbackDetailBody({
  feedback,
  feedbackId,
  isAdmin,
}: LoadedFeedbackProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col">
        <FeedbackDetailMetadata
          feedback={feedback}
          feedbackId={feedbackId}
          isAdmin={isAdmin}
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

function FeedbackDetailContent({
  isLoading,
  feedback,
  feedbackId,
  isAdmin,
}: FeedbackDetailContentProps) {
  if (isLoading) {
    return <FeedbackDetailSkeleton />;
  }

  if (!(feedback && feedbackId)) {
    return null;
  }

  return (
    <FeedbackDetailBody
      feedback={feedback}
      feedbackId={feedbackId}
      isAdmin={isAdmin}
    />
  );
}
