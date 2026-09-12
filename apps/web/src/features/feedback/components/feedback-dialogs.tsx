import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Input } from "@ctrl-ui/react/ui/input";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Label } from "@/components/ui/label";

interface CreateFeedbackDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
}

export function CreateFeedbackDialog({
  open,
  onOpenChange,
  organizationId,
}: CreateFeedbackDialogProps) {
  const createFeedback = useMutation(api.feedback.mutations.create);
  const [newFeedback, setNewFeedback] = useState({
    description: "",
    title: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newFeedback.title.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createFeedback({
        description: newFeedback.description.trim(),
        organizationId,
        title: newFeedback.title.trim(),
      });
      onOpenChange(false);
      setNewFeedback({ description: "", title: "" });
    } catch (error) {
      console.error("Failed to create feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add feedback</DialogTitle>
          <DialogDescription>
            Share your ideas, report bugs, or request features.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              onChange={(e) =>
                setNewFeedback({ ...newFeedback, title: e.target.value })
              }
              placeholder="Short summary of your feedback"
              value={newFeedback.title}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              onChange={(e) =>
                setNewFeedback({ ...newFeedback, description: e.target.value })
              }
              placeholder="Provide more details..."
              rows={4}
              value={newFeedback.description}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="surface">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            tone="primary"
            variant="solid"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteFeedbackDialogProps {
  feedbackId: Id<"feedback"> | null;
  onClose: () => void;
}

export function DeleteFeedbackDialog({
  feedbackId,
  onClose,
}: DeleteFeedbackDialogProps) {
  const deleteFeedback = useMutation(api.feedback.actions.remove);

  const handleDelete = async () => {
    if (!feedbackId) {
      return;
    }
    try {
      await deleteFeedback({ id: feedbackId });
      onClose();
    } catch (error) {
      console.error("Failed to delete feedback:", error);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={!!feedbackId}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete feedback</DialogTitle>
          <DialogDescription>
            This feedback will be moved to trash. You can restore it within 30
            days.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="surface">
            Cancel
          </Button>
          <Button onClick={handleDelete} tone="danger" variant="surface">
            Move to trash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
