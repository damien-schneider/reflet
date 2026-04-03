"use client";

import type { UIMessage } from "@convex-dev/agent";
import { useSmoothText } from "@convex-dev/agent/react";
import { IconSparkles, IconUser } from "@tabler/icons-react";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

export function CeoChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";

  const [visibleText] = useSmoothText(message.text ?? "", {
    startStreaming: isStreaming,
  });

  const displayText = visibleText || message.text;

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground text-sm">
          <p className="wrap-break-word whitespace-pre-wrap leading-relaxed">
            {displayText}
          </p>
        </div>
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
          <IconUser className="size-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <IconSparkles className="size-3 text-primary" />
      </div>
      <div className="max-w-[85%] space-y-1">
        <div
          className={cn(
            "rounded-2xl rounded-bl-md bg-muted/60 px-3.5 py-2 text-foreground text-sm",
            isStreaming && !displayText && "animate-pulse"
          )}
        >
          {displayText ? (
            <div className="ceo-chat-markdown wrap-break-word max-w-none leading-relaxed">
              <Streamdown
                caret={isStreaming ? "block" : undefined}
                isAnimating={isStreaming}
                mode={isStreaming ? "streaming" : "static"}
              >
                {displayText}
              </Streamdown>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className="size-1 animate-pulse rounded-full bg-foreground/20" />
              <span className="size-1 animate-pulse rounded-full bg-foreground/20 [animation-delay:150ms]" />
              <span className="size-1 animate-pulse rounded-full bg-foreground/20 [animation-delay:300ms]" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
