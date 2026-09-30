"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { type RefObject, useId, useState } from "react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  className?: string;
  disabled?: boolean;
  label?: string;
  onSend: (message: string) => void | Promise<void>;
  placeholder?: string;
  ref?: RefObject<HTMLTextAreaElement | null>;
}

export function MessageInput({
  onSend,
  disabled = false,
  label = "Message",
  placeholder = "Write a message…",
  className,
  ref,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const trimmedMessage = message.trim();
  const canSend = trimmedMessage.length > 0 && !disabled && !isSending;

  const sendMessage = async () => {
    if (!canSend) {
      return;
    }

    setIsSending(true);
    setError(null);
    setMessage("");
    try {
      await onSend(trimmedMessage);
    } catch {
      setMessage((draft) => draft || message);
      setError("Message not sent. Check your connection and try again.");
    }
    setIsSending(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isPlainEnter = event.key === "Enter" && !event.shiftKey;
    if (isPlainEnter && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <form
      className={cn("border-t bg-background p-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        sendMessage();
      }}
    >
      <div className="flex items-end gap-2">
        <Textarea
          aria-describedby={error ? errorId : undefined}
          aria-label={label}
          className="field-sizing-content max-h-32 min-h-10 resize-none"
          disabled={disabled}
          enterKeyHint="send"
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={ref}
          rows={1}
          value={message}
        />
        <Button
          aria-busy={isSending}
          disabled={!canSend}
          iconOnly
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isSending ? (
            <Spinner aria-hidden size="xs" />
          ) : (
            <PaperPlaneRight aria-hidden weight="fill" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-destructive text-xs" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
