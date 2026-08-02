"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import { type RefObject, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  onSend: (message: string) => void | Promise<void>;
  placeholder?: string;
  ref?: RefObject<HTMLTextAreaElement | null>;
}

export function MessageInput({
  onSend,
  autoFocus = false,
  disabled = false,
  placeholder = "Type your message...",
  className,
  ref,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      await onSend(trimmedMessage);
      setMessage("");
    } catch {
      setError("Your message could not be sent. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || isSending;
  const canSend = message.trim().length > 0 && !isDisabled;

  return (
    <div className={cn("border-t bg-background p-4", className)}>
      <div className="flex items-end gap-2">
        <Textarea
          autoFocus={autoFocus}
          className="max-h-32 min-h-10 resize-none"
          disabled={isDisabled}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={ref}
          rows={1}
          value={message}
        />
        <Button
          className="shrink-0"
          disabled={!canSend}
          onClick={handleSend}
          size="icon"
        >
          <PaperPlaneRight className="h-4 w-4" weight="fill" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
