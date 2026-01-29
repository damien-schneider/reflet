import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { cn } from "@/lib/utils";

interface FeedbackCreatorProps {
  boardId: Id<"boards">;
  className?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FeedbackCreator({
  boardId,
  className,
  onSuccess,
  onCancel,
}: FeedbackCreatorProps) {
  const createFeedback = useMutation(api.feedback.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await createFeedback({
        boardId,
        title: title.trim(),
        description: description.trim(),
      });

      toast.success("Feedback submitted successfully!");
      setTitle("");
      setDescription("");
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit feedback"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={cn("space-y-4", className)} onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          disabled={isSubmitting}
          id="title"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short, descriptive title for your feedback"
          required
          value={title}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <TiptapMarkdownEditor
          className="min-h-36"
          disabled={isSubmitting}
          onChange={setDescription}
          placeholder="Provide more details about your feedback... Type '/' for formatting options"
          value={description}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        )}
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </form>
  );
}
