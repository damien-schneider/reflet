"use client";

import type { UIMessage } from "@convex-dev/agent";
import { useSmoothText, useUIMessages } from "@convex-dev/agent/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconMessageOff, IconSparkles, IconUser } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { Streamdown } from "streamdown";

import "@/components/ui/tiptap/styles.css";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { GridAgentId } from "./agent-grid-card";

/**
 * Read-only real-time conversation stream for an agent.
 * Uses `@convex-dev/agent/react` hooks for streaming support with Streamdown rendering.
 *
 * Currently only the CEO ("orchestrator") has a conversation thread.
 * Other agents show an empty state.
 */
export function AgentConversationStream({
  organizationId,
  agentId,
}: {
  organizationId: Id<"organizations">;
  agentId: GridAgentId;
}) {
  // Only CEO has a thread via ceo_chat system
  const isCeo = agentId === "orchestrator";

  if (isCeo) {
    return <CeoConversationStream organizationId={organizationId} />;
  }

  // For other agents, check if they have a thread in autopilotAgentThreads
  return (
    <AgentThreadStream agentId={agentId} organizationId={organizationId} />
  );
}

/**
 * Streams the CEO chat thread using the existing ceo_chat queries.
 */
function CeoConversationStream({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const threadId = useQuery(api.autopilot.ceo_chat.getThread, {
    organizationId,
  });

  if (threadId === undefined) {
    return <StreamSkeleton />;
  }

  if (threadId === null) {
    return <EmptyThreadState agentLabel="CEO" />;
  }

  return (
    <ActiveCeoStream organizationId={organizationId} threadId={threadId} />
  );
}

function ActiveCeoStream({
  threadId,
  organizationId,
}: {
  threadId: string;
  organizationId: Id<"organizations">;
}) {
  const { results: messages, status } = useUIMessages(
    api.autopilot.ceo_chat.listMessages,
    { threadId, organizationId },
    { initialNumItems: 50, stream: true }
  );

  return (
    <ConversationContainer>
      {messages.length === 0 && status !== "LoadingMore" ? (
        <EmptyThreadState agentLabel="CEO" />
      ) : (
        <>
          {messages.map((message) => (
            <StreamMessage key={message.key} message={message} />
          ))}
          {status === "LoadingMore" && (
            <div className="flex justify-center py-2">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/30" />
            </div>
          )}
        </>
      )}
    </ConversationContainer>
  );
}

/**
 * Shows thread messages for non-CEO agents from autopilotAgentThreads.
 * These threads use the legacy message system (not @convex-dev/agent streaming).
 * Messages are displayed statically with Streamdown in static mode.
 */
function AgentThreadStream({
  organizationId,
  agentId,
}: {
  organizationId: Id<"organizations">;
  agentId: GridAgentId;
}) {
  const thread = useQuery(api.autopilot.queries.agent_detail.getAgentThread, {
    organizationId,
    agent: agentId,
  });

  if (thread === undefined) {
    return <StreamSkeleton />;
  }

  if (thread === null) {
    return (
      <ConversationContainer>
        <EmptyThreadState agentLabel={agentId.toUpperCase()} />
      </ConversationContainer>
    );
  }

  return (
    <AgentThreadMessages
      agentLabel={agentId.toUpperCase()}
      threadId={thread._id}
    />
  );
}

function AgentThreadMessages({
  threadId,
  agentLabel,
}: {
  threadId: Id<"autopilotAgentThreads">;
  agentLabel: string;
}) {
  const messages = useQuery(api.autopilot.queries.threads.getThreadMessages, {
    threadId,
    limit: 100,
  });

  if (messages === undefined) {
    return <StreamSkeleton />;
  }

  if (messages.length === 0) {
    return (
      <ConversationContainer>
        <EmptyThreadState agentLabel={agentLabel} />
      </ConversationContainer>
    );
  }

  return (
    <ConversationContainer>
      {/* Messages are desc from query — reverse for chronological display */}
      {[...messages].reverse().map((msg) => (
        <StaticMessage content={msg.content} key={msg._id} role={msg.role} />
      ))}
    </ConversationContainer>
  );
}

// ============================================
// MESSAGE COMPONENTS
// ============================================

function StreamMessage({ message }: { message: UIMessage }) {
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
            <div className="markdown-content wrap-break-word max-w-none">
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

function StaticMessage({
  role,
  content,
}: {
  role: "user" | "agent";
  content: string;
}) {
  if (role === "user") {
    return (
      <div className="flex items-start justify-end gap-2">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground text-sm">
          <p className="wrap-break-word whitespace-pre-wrap leading-relaxed">
            {content}
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
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-bl-md bg-muted/60 px-3.5 py-2 text-foreground text-sm">
          <div className="markdown-content wrap-break-word max-w-none">
            <Streamdown mode="static">{content}</Streamdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SHARED UI
// ============================================

function ConversationContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className="border-border border-b px-4 py-3">
        <h3 className="font-semibold text-sm">Conversation</h3>
      </div>
      <ScrollArea
        className="flex-1"
        classNameViewport="p-4"
        direction="vertical"
      >
        <div className="flex flex-col gap-4">{children}</div>
      </ScrollArea>
    </div>
  );
}

function EmptyThreadState({ agentLabel }: { agentLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted/50">
        <IconMessageOff className="size-5 text-muted-foreground/30" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-muted-foreground/60 text-sm">
          No conversation yet
        </p>
        <p className="max-w-[200px] text-muted-foreground/40 text-xs leading-relaxed">
          {agentLabel} hasn&apos;t started a conversation thread yet
        </p>
      </div>
    </div>
  );
}

function StreamSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className="border-border border-b px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div className="flex items-start gap-2" key={`msg-skel-${String(i)}`}>
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-16 flex-1 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
