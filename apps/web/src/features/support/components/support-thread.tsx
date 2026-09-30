"use client";

import { Card } from "@ctrl-ui/react/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { useEffect } from "react";
import { H2 } from "@/components/ui/typography";
import { ConversationStatusBadge } from "@/features/support/components/conversation-status-badge";
import { MessageInput } from "@/features/support/components/message-input";
import { MessageList } from "@/features/support/components/message-list";
import { cn } from "@/lib/utils";

interface SupportThreadProps {
  conversationId: Id<"supportConversations">;
  guestId?: string;
}

const THREAD_HEIGHT = "h-[min(70dvh,44rem)]";

export function SupportThread({ conversationId, guestId }: SupportThreadProps) {
  const conversation = useQuery(api.support.conversations.get, {
    guestId,
    id: conversationId,
  });
  const messages = useQuery(api.support.messages.list, {
    conversationId,
    guestId,
  });

  const sendMessage = useMutation(api.support.messages.send);
  const markAsRead = useMutation(api.support.messages.markAsRead);

  const hasUnreadFromAdmin = messages?.some(
    (message) => !message.isRead && message.senderType === "admin"
  );

  useEffect(() => {
    if (hasUnreadFromAdmin) {
      markAsRead({ conversationId, guestId });
    }
  }, [conversationId, guestId, hasUnreadFromAdmin, markAsRead]);

  if (conversation === undefined) {
    return (
      <Card
        className={cn("flex flex-col gap-3 p-4", THREAD_HEIGHT)}
        role="status"
      >
        <span className="sr-only">Loading conversation…</span>
        <Skeleton aria-hidden className="h-5 w-1/2" />
        <Skeleton aria-hidden className="h-3 w-32" />
      </Card>
    );
  }

  if (conversation === null) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Conversation unavailable</EmptyTitle>
          <EmptyDescription>
            It was removed, or you no longer have access to it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const title = conversation.subject || "Support conversation";

  return (
    <Card className={cn("flex flex-col overflow-hidden p-0", THREAD_HEIGHT)}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <H2 className="truncate" title={title} variant="card">
            {title}
          </H2>
          <p className="text-muted-foreground text-sm">
            Started{" "}
            <time
              className="tabular-nums"
              dateTime={new Date(conversation.createdAt).toISOString()}
              title={format(conversation.createdAt, "PPpp")}
            >
              {format(conversation.createdAt, "PP")}
            </time>
          </p>
        </div>
        <ConversationStatusBadge status={conversation.status} />
      </div>

      <MessageList
        conversationId={conversationId}
        guestId={guestId}
        messages={messages}
      />

      <MessageInput
        label="Reply"
        onSend={async (body) => {
          await sendMessage({ body, conversationId, guestId });
        }}
        placeholder="Reply to support…"
      />
    </Card>
  );
}
