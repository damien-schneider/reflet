"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { SupportCredential } from "@reflet/backend/convex/support/access";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { useEffect } from "react";
import { ConversationStatusBadge } from "@/features/support/components/conversation-status-badge";
import { MessageComposer } from "@/features/support/components/thread/message-composer";
import { MessageThread } from "@/features/support/components/thread/message-thread";

interface SupportThreadProps {
  conversationId: Id<"supportConversations">;
  credential?: SupportCredential;
  onBack?: () => void;
}

export function SupportThread({
  conversationId,
  credential,
  onBack,
}: SupportThreadProps) {
  const conversation = useQuery(api.support.conversations.get, {
    credential,
    id: conversationId,
  });
  const messages = useQuery(api.support.messages.list, {
    conversationId,
    credential,
  });
  const sendMessage = useMutation(api.support.messages.send);
  const markAsRead = useMutation(api.support.messages.markAsRead);

  const hasUnreadFromSupport = messages?.some(
    (message) => !message.isRead && message.senderType === "admin"
  );

  useEffect(() => {
    if (hasUnreadFromSupport) {
      markAsRead({ conversationId, credential });
    }
  }, [conversationId, credential, hasUnreadFromSupport, markAsRead]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b px-2 py-2">
        {onBack && (
          <Button
            aria-label="All conversations"
            iconOnly
            onClick={onBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft aria-hidden />
          </Button>
        )}
        <ThreadTitle conversation={conversation} />
      </div>
      {conversation === null ? (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyTitle>Conversation unavailable</EmptyTitle>
            <EmptyDescription>
              It was removed, or you no longer have access to it.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <MessageThread
          composer={
            <MessageComposer
              field={{ label: "Reply", placeholder: "Reply to support…" }}
              onSend={async (body) => {
                await sendMessage({ body, conversationId, credential });
              }}
            />
          }
          conversation={{ credential, id: conversationId }}
          messages={messages}
        />
      )}
    </div>
  );
}

function ThreadTitle({
  conversation,
}: {
  conversation:
    | { createdAt: number; status: string; subject?: string }
    | null
    | undefined;
}) {
  if (conversation === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-1.5" role="status">
        <span className="sr-only">Loading conversation…</span>
        <Skeleton aria-hidden className="h-4 w-1/2" />
        <Skeleton aria-hidden className="h-3 w-24" />
      </div>
    );
  }
  if (conversation === null) {
    return null;
  }

  const title = conversation.subject || "Support conversation";
  return (
    <>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-medium text-body" title={title}>
          {title}
        </h2>
        <p className="text-caption text-muted-foreground">
          Started{" "}
          <time
            dateTime={new Date(conversation.createdAt).toISOString()}
            title={format(conversation.createdAt, "PPpp")}
          >
            {format(conversation.createdAt, "PP")}
          </time>
        </p>
      </div>
      <ConversationStatusBadge status={conversation.status} viewer="customer" />
    </>
  );
}
