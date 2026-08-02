"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";

import { Card } from "@/components/ui/card";
import { H2, Muted, Text } from "@/components/ui/typography";
import { ConversationStatusBadge } from "@/features/support/components/conversation-status-badge";
import { MessageInput } from "@/features/support/components/message-input";
import { MessageList } from "@/features/support/components/message-list";
import { SupportLoadingState } from "@/features/support/components/support-loading-state";

interface SupportThreadProps {
  conversationId: Id<"supportConversations">;
  guestId?: string;
}

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
    return <SupportLoadingState />;
  }

  if (conversation === null) {
    return (
      <div className="py-16 text-center">
        <H2 variant="card">Conversation unavailable</H2>
        <Muted className="mt-2">
          This conversation doesn&apos;t exist or you no longer have access to
          it.
        </Muted>
      </div>
    );
  }

  return (
    <Card className="flex h-[70vh] flex-col overflow-hidden p-0">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <H2 variant="card">
            {conversation.subject || "Support conversation"}
          </H2>
          <Text variant="bodySmall">
            Started {new Date(conversation.createdAt).toLocaleDateString()}
          </Text>
        </div>
        <ConversationStatusBadge status={conversation.status} />
      </div>

      <MessageList
        conversationId={conversationId}
        guestId={guestId}
        messages={messages}
      />

      <MessageInput
        onSend={async (body) => {
          await sendMessage({ body, conversationId, guestId });
        }}
        placeholder="Reply to support..."
      />
    </Card>
  );
}
