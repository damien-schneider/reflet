"use client";

import { X } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { cn } from "@/lib/utils";
import { AttachmentUpload } from "./attachment-upload";

interface SubmitFeedbackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
  feedback: {
    title: string;
    description: string;
    email: string;
    attachments: string[];
  };
  onFeedbackChange: (feedback: {
    title: string;
    description: string;
    email: string;
    attachments: string[];
  }) => void;
  isSubmitting: boolean;
  isMember: boolean;
}

export function SubmitFeedbackDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  feedback,
  onFeedbackChange,
  isSubmitting,
  isMember,
}: SubmitFeedbackDialogProps) {
  const canSubmit = !isSubmitting && feedback.title.trim();

  // Handle cmd+enter (Mac) or ctrl+enter (Windows/Linux) to submit
  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent
        className="gap-0 overflow-hidden p-0 md:w-[50vw] md:max-w-2xl"
        showCloseButton={false}
        side="right"
        variant="panel"
      >
        {/* Header */}
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <SheetTitle className="font-medium text-base">
            Submit Feedback
          </SheetTitle>
          <SheetDescription className="sr-only">
            Share your ideas, report bugs, or request features.
          </SheetDescription>

          {/* Close button */}
          <SheetClose
            render={
              <Button
                onClick={() => onOpenChange(false)}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </SheetHeader>

        {/* Document-like content area */}
        <div className="flex min-h-100 flex-1 flex-col overflow-y-auto">
          {/* Title area */}
          <div className="px-6 pt-6 pb-2">
            <TiptapTitleEditor
              autoFocus
              onChange={(value) =>
                onFeedbackChange({ ...feedback, title: value })
              }
              onSubmit={handleSubmit}
              placeholder="Untitled"
              value={feedback.title}
            />
          </div>

          {/* Divider */}
          <div className="mx-6 border-border/50 border-b" />

          {/* Description area - takes up remaining space */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TiptapMarkdownEditor
              minimal
              onChange={(value) =>
                onFeedbackChange({ ...feedback, description: value })
              }
              onSubmit={handleSubmit}
              placeholder="Add a description... Type '/' for commands, or drag and drop images/videos"
              value={feedback.description}
            />
          </div>

          {/* Attachments */}
          <div className="px-6 pb-4">
            <AttachmentUpload
              attachments={feedback.attachments}
              disabled={isSubmitting}
              onAttachmentsChange={(attachments) =>
                onFeedbackChange({ ...feedback, attachments })
              }
            />
          </div>

          {/* Footer */}
          <div
            className={cn(
              "border-t bg-muted/30 px-6 py-4",
              "flex items-center justify-between gap-4"
            )}
          >
            {/* Left side - email for non-members */}
            <div className="flex-1">
              {!isMember && (
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 max-w-60 text-sm"
                    onChange={(e) =>
                      onFeedbackChange({ ...feedback, email: e.target.value })
                    }
                    placeholder="Email for updates (optional)"
                    type="email"
                    value={feedback.email}
                  />
                </div>
              )}
            </div>

            {/* Right side - actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={isSubmitting || !feedback.title.trim()}
                onClick={onSubmit}
                size="sm"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
