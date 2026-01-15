import {
  type UIMessage,
  useSmoothText,
  useUIMessages,
} from "@convex-dev/agent/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/ai")({
  component: RouteComponent,
});

function MessageContent({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const [visibleText] = useSmoothText(text, {
    startStreaming: isStreaming,
  });
  return <Streamdown>{visibleText}</Streamdown>;
}

function RouteComponent() {
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createThread = useMutation(api.chat.createNewThread);
  const sendMessage = useMutation(api.chat.sendMessage);

  const { results: messages } = useUIMessages(
    api.chat.listMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true }
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const hasStreamingMessage = messages?.some(
    (m: UIMessage) => m.status === "streaming"
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    setIsLoading(true);
    setInput("");

    try {
      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = await createThread();
        setThreadId(currentThreadId);
      }

      await sendMessage({ threadId: currentThreadId, prompt: text });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto grid w-full grid-rows-[1fr_auto] overflow-hidden p-4">
      <div className="space-y-4 overflow-y-auto pb-4">
        {!messages || messages.length === 0 ? (
          <div className="mt-8 text-center text-muted-foreground">
            Ask me anything to get started!
          </div>
        ) : (
          messages.map((message: UIMessage) => (
            <div
              className={`rounded-lg p-3 ${
                message.role === "user"
                  ? "ml-8 bg-primary/10"
                  : "mr-8 bg-secondary/20"
              }`}
              key={message.key}
            >
              <p className="mb-1 font-semibold text-sm">
                {message.role === "user" ? "You" : "AI Assistant"}
              </p>
              <MessageContent
                isStreaming={message.status === "streaming"}
                text={message.text ?? ""}
              />
            </div>
          ))
        )}
        {isLoading && !hasStreamingMessage && (
          <div className="mr-8 rounded-lg bg-secondary/20 p-3">
            <p className="mb-1 font-semibold text-sm">AI Assistant</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="flex w-full items-center space-x-2 border-t pt-2"
        onSubmit={handleSubmit}
      >
        <Input
          autoComplete="off"
          autoFocus
          className="flex-1"
          disabled={isLoading}
          name="prompt"
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          value={input}
        />
        <Button disabled={isLoading || !input.trim()} size="icon" type="submit">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </Button>
      </form>
    </div>
  );
}
