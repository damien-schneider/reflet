"use client";

import {
  ChatLayout,
  ChatThread,
  ChatThreadScrollButton,
} from "@ctrl-ui/react/chat-layout";
import { TranscriptDivider } from "@ctrl-ui/react/transcript-divider";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { SupportCredential } from "@reflet/backend/convex/support/access";
import { useMutation, useQuery } from "convex/react";
import type { ReactNode } from "react";
import {
  SupportMessage,
  type SupportMessageData,
} from "@/features/support/components/thread/support-message";
import {
  dayLabel,
  groupMessagesByDay,
  startsBurst,
} from "@/features/support/lib/message-grouping";
import { authClient } from "@/lib/auth-client";

interface ThreadConversation {
  credential?: SupportCredential;
  id: Id<"supportConversations">;
}

interface MessageThreadProps {
  composer: ReactNode;
  conversation: ThreadConversation;
  messages: SupportMessageData[] | undefined;
}

export function MessageThread({
  composer,
  conversation,
  messages,
}: MessageThreadProps) {
  return (
    <ChatLayout chrome="embedded">
      <ChatThread
        composer={
          <>
            <ChatThreadScrollButton />
            {composer}
          </>
        }
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          <ThreadMessages conversation={conversation} messages={messages} />
        </div>
      </ChatThread>
    </ChatLayout>
  );
}

function ThreadMessages({
  conversation,
  messages,
}: Omit<MessageThreadProps, "composer">) {
  const { data: session } = authClient.useSession();
  const viewerId = session?.user?.id;
  const reactionRows = useQuery(api.support.messages.listReactions, {
    conversationId: conversation.id,
    credential: conversation.credential,
  });
  const addReaction = useMutation(api.support.messages.addReaction);
  const removeReaction = useMutation(api.support.messages.removeReaction);

  if (messages === undefined) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <span className="sr-only">Loading messages…</span>
        <Skeleton aria-hidden className="h-10 w-2/3" />
        <Skeleton aria-hidden className="h-10 w-1/2 self-end" />
        <Skeleton aria-hidden className="h-10 w-3/5" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyTitle>No messages yet</EmptyTitle>
          <EmptyDescription>
            Send a message to start the conversation.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const reactionsByMessage = new Map(
    reactionRows?.map((row) => [row.messageId, row.reactions])
  );

  const toggleReaction = async (message: SupportMessageData, emoji: string) => {
    const viewerReacted = reactionsByMessage
      .get(message._id)
      ?.some(
        (reaction) =>
          reaction.emoji === emoji &&
          viewerId !== undefined &&
          reaction.userIds.includes(viewerId)
      );
    try {
      await (viewerReacted
        ? removeReaction({ messageId: message._id })
        : addReaction({ emoji, messageId: message._id }));
    } catch {
      toast.error("Couldn’t update the reaction. Try again.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {groupMessagesByDay(messages).map((day) => (
        <section
          aria-label={dayLabel(day.messages[0].createdAt)}
          className="flex flex-col gap-1"
          key={day.day}
        >
          <TranscriptDivider className="mb-2">
            {dayLabel(day.messages[0].createdAt)}
          </TranscriptDivider>
          {day.messages.map((message, index) => (
            <SupportMessage
              key={message._id}
              message={message}
              reactions={{
                list: reactionsByMessage.get(message._id) ?? [],
                onToggle: viewerId
                  ? (emoji) => toggleReaction(message, emoji)
                  : undefined,
                viewerId,
              }}
              startsBurst={startsBurst(message, day.messages[index - 1])}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
