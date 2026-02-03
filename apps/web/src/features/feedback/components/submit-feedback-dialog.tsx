"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { cn } from "@/lib/utils";

interface SubmitFeedbackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
  feedback: {
    title: string;
    description: string;
    email: string;
  };
  onFeedbackChange: (feedback: {
    title: string;
    description: string;
    email: string;
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
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        {/* Hidden accessible title and description */}
        <DialogTitle className="sr-only">Submit feedback</DialogTitle>
        <DialogDescription className="sr-only">
          Share your ideas, report bugs, or request features.
        </DialogDescription>

        {/* Document-like content area */}
        <div className="flex min-h-[400px] flex-col">
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
                    aria-label="Email for updates"
                    className="h-8 max-w-[240px] text-sm"
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
              <DialogClose
                render={
                  <Button size="sm" variant="ghost">
                    Cancel
                  </Button>
                }
              />
              <Button
                disabled={isSubmitting || !feedback.title.trim()}
                onClick={onSubmit}
                size="sm"
              >
                {isSubmitting && <Spinner className="mr-2" />}
                {isSubmitting ? "Submitting" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
