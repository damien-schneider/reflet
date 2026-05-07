"use client";

import {
  optimisticallySendMessage,
  useUIMessages,
} from "@convex-dev/agent/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconArrowUp, IconSparkles, IconX } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ceoChatOpenAtom } from "@/store/ui";

import { CeoChatMessage } from "./ceo-chat-message";

export function CeoChatPanel({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const setChatOpen = useSetAtom(ceoChatOpenAtom);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadId = useQuery(api.autopilot.ceo_chat.getThread, {
    organizationId,
  });

  const getOrCreateThread = useMutation(
    api.autopilot.ceo_chat.getOrCreateThread
  );

  const sendMessage = useMutation(
    api.autopilot.ceo_chat.sendMessage
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.autopilot.ceo_chat.listMessages)
  );

  const activeThreadId = threadId ?? undefined;

  const { results: messages, status } = useUIMessages(
    api.autopilot.ceo_chat.listMessages,
    activeThreadId ? { threadId: activeThreadId, organizationId } : "skip",
    { initialNumItems: 50, stream: true }
  );
  const latestMessageKey = messages.at(-1)?.key;

  useEffect(
    function scrollToBottom() {
      if (latestMessageKey || status) {
        bottomRef.current?.scrollIntoView({ block: "end" });
      }
    },
    [latestMessageKey, status]
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    setInput("");
    setIsSending(true);

    try {
      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = await getOrCreateThread({ organizationId });
      }

      await sendMessage({
        organizationId,
        threadId: currentThreadId,
        prompt: trimmed,
      });
    } catch (error) {
      setInput(trimmed);
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-border border-b px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
          <IconSparkles className="size-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm leading-tight">
            CEO
          </p>
          <p className="truncate text-muted-foreground text-xs">
            Strategic advisor
          </p>
        </div>
        <Button
          aria-label="Close CEO chat"
          className="ml-auto size-8"
          onClick={() => setChatOpen(false)}
          size="icon"
          variant="ghost"
        >
          <IconX className="size-4" />
        </Button>
      </div>

      <ScrollArea
        className="flex-1"
        classNameViewport="p-4"
        direction="vertical"
      >
        <div className="flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/5">
                <IconSparkles className="size-6 text-primary/40" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-foreground/80 text-sm">
                  Your strategic AI advisor
                </p>
                <p className="max-w-[200px] text-muted-foreground/60 text-xs leading-relaxed">
                  Ask about strategy, metrics, agent performance, or next steps
                </p>
              </div>
            </div>
          )}
          {messages.map((message) => (
            <CeoChatMessage key={message.key} message={message} />
          ))}
          {status === "LoadingMore" && (
            <div className="flex justify-center py-2">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/30" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-border border-t p-3">
        <div className="relative">
          <Textarea
            className="max-h-32 min-h-[2.5rem] resize-none pr-10 text-sm focus-visible:ring-1"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message CEO..."
            rows={1}
            value={input}
          />
          <Button
            aria-label="Send message"
            className="absolute right-1.5 bottom-1.5 size-7"
            disabled={isSending || !input.trim()}
            onClick={handleSend}
            size="icon"
          >
            <IconArrowUp className="size-3.5" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
          ⌘+Enter to send
        </p>
      </div>
    </div>
  );
}
