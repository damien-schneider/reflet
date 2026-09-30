"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ctrl-ui/react/ui/sheet";
import { X } from "@phosphor-icons/react";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { cn } from "@/lib/utils";
import { AttachmentUpload } from "./attachment-upload";
import {
  type FeedbackDraft,
  MAX_TITLE_LENGTH,
  SubmitFeedbackFooter,
  type SubmitFeedbackFooterProps,
  type TitleValidationState,
} from "./submit-feedback-dialog-footer";

const TITLE_COUNTER_THRESHOLD = 90;

interface SubmitFeedbackDialogProps
  extends Omit<SubmitFeedbackFooterProps, "onCancel" | "validation"> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
}

interface FeedbackSectionProps {
  feedback: FeedbackDraft;
  onFeedbackChange: (feedback: FeedbackDraft) => void;
  onSubmit: () => void;
}

function useTitleValidation(
  feedback: FeedbackDraft,
  isSubmitting: boolean
): TitleValidationState {
  const titleLength = feedback.title.length;
  const isTitleOverLimit = titleLength > MAX_TITLE_LENGTH;
  const isTitleEmpty = feedback.title.trim().length === 0;
  return {
    canSubmit: !(isSubmitting || isTitleEmpty || isTitleOverLimit),
    isTitleMissing: isTitleEmpty && feedback.description.trim() !== "",
    isTitleOverLimit,
    showTitleCounter: titleLength >= TITLE_COUNTER_THRESHOLD,
    titleLength,
  };
}

export function SubmitFeedbackDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  ...footerProps
}: SubmitFeedbackDialogProps) {
  const { feedback, onFeedbackChange, isSubmitting } = footerProps;
  const validation = useTitleValidation(feedback, isSubmitting);

  const handleSubmit = () => {
    if (validation.canSubmit) {
      onSubmit();
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent
        className="gap-0 overflow-hidden p-0 md:w-[50vw] md:max-w-2xl"
        side="right"
      >
        <SubmitFeedbackHeader />
        <form
          action={handleSubmit}
          className="flex min-h-100 flex-1 flex-col overflow-y-auto"
        >
          <TitleSection
            feedback={feedback}
            onFeedbackChange={onFeedbackChange}
            onSubmit={handleSubmit}
            validation={validation}
          />
          <div className="mx-6 border-border/50 border-b" />
          <DescriptionSection
            feedback={feedback}
            isSubmitting={isSubmitting}
            onFeedbackChange={onFeedbackChange}
            onSubmit={handleSubmit}
          />
          <SubmitFeedbackFooter
            {...footerProps}
            onCancel={() => onOpenChange(false)}
            validation={validation}
          />
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SubmitFeedbackHeader() {
  return (
    <SheetHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
      <SheetTitle>Submit feedback</SheetTitle>
      <SheetDescription className="sr-only">
        Share an idea, report a bug, or request a feature.
      </SheetDescription>
      <SheetClose
        render={
          <Button aria-label="Close" iconOnly size="sm" variant="ghost" />
        }
      >
        <X />
      </SheetClose>
    </SheetHeader>
  );
}

function TitleSection({
  feedback,
  onFeedbackChange,
  onSubmit,
  validation,
}: FeedbackSectionProps & { validation: TitleValidationState }) {
  const { isTitleOverLimit, showTitleCounter, titleLength } = validation;

  return (
    <div className="px-6 pt-6 pb-2">
      <TiptapTitleEditor
        autoFocus
        onChange={(value) => onFeedbackChange({ ...feedback, title: value })}
        onSubmit={onSubmit}
        placeholder="Untitled"
        value={feedback.title}
      />
      {showTitleCounter && (
        <p
          className={cn(
            "mt-1 text-right text-xs tabular-nums",
            isTitleOverLimit ? "text-destructive-text" : "text-muted-foreground"
          )}
        >
          Title: {titleLength}/{MAX_TITLE_LENGTH}
        </p>
      )}
    </div>
  );
}

function DescriptionSection({
  feedback,
  isSubmitting,
  onFeedbackChange,
  onSubmit,
}: FeedbackSectionProps & { isSubmitting: boolean }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <TiptapMarkdownEditor
          minimal
          onChange={(value) =>
            onFeedbackChange({ ...feedback, description: value })
          }
          onSubmit={onSubmit}
          placeholder="Add details. Type “/” for commands, or drop images and videos here."
          value={feedback.description}
        />
      </div>
      <div className="px-6 pb-4">
        <AttachmentUpload
          attachments={feedback.attachments}
          disabled={isSubmitting}
          onAttachmentsChange={(attachments) =>
            onFeedbackChange({ ...feedback, attachments })
          }
        />
      </div>
    </>
  );
}
