"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ConversationComposerProps {
  alwaysExpanded?: boolean;
  className?: string;
  guestEmail?: string;
  isGuest?: boolean;
  isSubmitting: boolean;
  onGuestEmailChange?: (email: string) => void;
  onSubmit: (data: {
    subject: string;
    message: string;
    email?: string;
  }) => void;
}

export function ConversationComposer({
  alwaysExpanded = false,
  isSubmitting,
  onSubmit,
  className,
  isGuest,
  guestEmail = "",
  onGuestEmailChange,
}: ConversationComposerProps) {
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const hasValidEmail = !isGuest || guestEmail.includes("@");
  const canSend = message.trim().length > 0 && !isSubmitting && hasValidEmail;

  const handleSubmit = () => {
    if (!canSend) {
      return;
    }
    onSubmit({
      subject: subject.trim(),
      message: message.trim(),
      email: isGuest ? guestEmail.trim() : undefined,
    });
    setSubject("");
    setMessage("");
    if (!alwaysExpanded) {
      setExpanded(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 transition-all",
        expanded && "ring-1 ring-ring",
        className
      )}
    >
      {expanded && isGuest && (
        <Input
          className="mb-2 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          disabled={isSubmitting}
          onChange={(e) => onGuestEmailChange?.(e.target.value)}
          placeholder="Your email *"
          type="email"
          value={guestEmail}
        />
      )}
      {expanded && (
        <Input
          className="mb-2 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          disabled={isSubmitting}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          value={subject}
        />
      )}

      <Textarea
        className={cn(
          "min-h-10 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
          expanded ? "min-h-20" : "min-h-10"
        )}
        disabled={isSubmitting}
        onChange={(e) => setMessage(e.target.value)}
        onFocus={() => setExpanded(true)}
        onKeyDown={handleKeyDown}
        placeholder="What do you need help with?"
        rows={expanded ? 3 : 1}
        value={message}
      />

      {expanded && (
        <div className="mt-2 flex items-center justify-end">
          <Button disabled={!canSend} onClick={handleSubmit} size="sm">
            <PaperPlaneRight className="h-4 w-4" weight="fill" />
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
