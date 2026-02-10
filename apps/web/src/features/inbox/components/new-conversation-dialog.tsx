"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";

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

interface NewConversationDialogProps {
  organizationId: Id<"organizations">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    organizationId: Id<"organizations">;
    subject?: string;
    initialMessage: string;
  }) => Promise<string | undefined>;
  onSuccess?: (conversationId: string) => void;
}

export function NewConversationDialog({
  organizationId,
  open,
  onOpenChange,
  onSubmit,
  onSuccess,
}: NewConversationDialogProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    setIsSubmitting(true);
    try {
      const conversationId = await onSubmit({
        organizationId,
        subject: subject.trim() || undefined,
        initialMessage: trimmedMessage,
      });
      onOpenChange(false);
      setSubject("");
      setMessage("");
      if (conversationId) {
        onSuccess?.(conversationId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = message.trim().length > 0 && !isSubmitting;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Start a new support conversation. We'll get back to you as soon as
            possible.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input
              disabled={isSubmitting}
              id="subject"
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              value={subject}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              className="min-h-24"
              disabled={isSubmitting}
              id="message"
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question..."
              value={message}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            <PaperPlaneRight className="h-4 w-4" weight="fill" />
            Send message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
