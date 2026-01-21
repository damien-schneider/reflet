"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  primaryColor: string;
}

export function SubmitFeedbackDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  feedback,
  onFeedbackChange,
  isSubmitting,
  isMember,
  primaryColor,
}: SubmitFeedbackDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit feedback</DialogTitle>
          <DialogDescription>
            Share your ideas, report bugs, or request features.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              onChange={(e) =>
                onFeedbackChange({ ...feedback, title: e.target.value })
              }
              placeholder="Short summary of your feedback"
              value={feedback.title}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              onChange={(e) =>
                onFeedbackChange({
                  ...feedback,
                  description: e.target.value,
                })
              }
              placeholder="Provide more details..."
              rows={4}
              value={feedback.description}
            />
          </div>
          {!isMember && (
            <div className="grid gap-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                onChange={(e) =>
                  onFeedbackChange({ ...feedback, email: e.target.value })
                }
                placeholder="your@email.com"
                type="email"
                value={feedback.email}
              />
              <p className="text-muted-foreground text-xs">
                We&apos;ll notify you when there are updates to your feedback.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !feedback.title.trim()}
            onClick={onSubmit}
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
