"use client";

import {
  ChatComposer,
  ChatComposerShell,
  ChatComposerSubmit,
  ChatComposerTextarea,
  ChatComposerToolbar,
} from "@ctrl-ui/react/chat-composer";
import { cn } from "@ctrl-ui/react/lib/cn";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { type RefObject, useId, useState } from "react";

interface MessageComposerProps {
  field: {
    disabledReason?: string;
    label: string;
    placeholder: string;
  };
  onSend: (body: string) => Promise<void>;
  ref?: RefObject<HTMLTextAreaElement | null>;
}

export function MessageComposer({ field, onSend, ref }: MessageComposerProps) {
  const [draft, setDraft] = useState("");
  const [sendFailed, setSendFailed] = useState(false);
  const errorId = useId();

  const sendDraft = async ({ value }: { value: string }) => {
    setSendFailed(false);
    setDraft("");
    try {
      await onSend(value);
    } catch {
      setDraft((current) => current || value);
      setSendFailed(true);
    }
  };

  return (
    <ChatComposer
      className="mx-auto max-w-3xl px-4 pb-4"
      density="compact"
      disabled={field.disabledReason !== undefined}
      onSubmit={sendDraft}
      onValueChange={setDraft}
      value={draft}
    >
      <ChatComposerShell>
        <ChatComposerTextarea
          aria-describedby={sendFailed ? errorId : undefined}
          aria-label={field.label}
          enterKeyHint="send"
          placeholder={field.disabledReason ?? field.placeholder}
          ref={ref}
          rows={1}
        />
        <ChatComposerToolbar className="px-2 pb-2">
          <span
            className={cn(
              "pointer-coarse:invisible ps-1 text-caption text-muted-foreground",
              field.disabledReason !== undefined && "invisible"
            )}
          >
            Enter to send · Shift + Enter for a new line
          </span>
          <ChatComposerSubmit aria-label="Send message" iconOnly>
            <PaperPlaneRight aria-hidden weight="fill" />
          </ChatComposerSubmit>
        </ChatComposerToolbar>
      </ChatComposerShell>
      {sendFailed && (
        <p
          className="mt-2 text-destructive-text text-label"
          id={errorId}
          role="alert"
        >
          Message not sent. Check your connection and try again.
        </p>
      )}
    </ChatComposer>
  );
}
