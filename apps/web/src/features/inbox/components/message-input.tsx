"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  className?: string;
  disabled?: boolean;
  focusOnMount?: boolean;
  onSend: (message: string) => void | Promise<void>;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  focusOnMount = false,
  placeholder = "Type your message...",
  className,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const hasFocusedTextarea = useRef(false);

  const handleTextareaRef = (textarea: HTMLTextAreaElement | null) => {
    if (!(textarea && focusOnMount && !hasFocusedTextarea.current)) {
      return;
    }
    textarea.focus();
    hasFocusedTextarea.current = true;
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await onSend(trimmedMessage);
      setMessage("");
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
    <div
      className={cn(
        "flex items-end gap-2 border-t bg-background p-4",
        className
      )}
    >
      <Textarea
        className="max-h-32 min-h-10 resize-none"
        disabled={isDisabled}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={handleTextareaRef}
        rows={1}
        value={message}
      />
      <Button
        className="shrink-0"
        disabled={!canSend}
        onClick={handleSend}
        size="icon"
      >
        <PaperPlaneRight className="size-4" weight="fill" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
}
