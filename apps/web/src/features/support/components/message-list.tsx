"use client";

import { ChatCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format, isToday, isYesterday } from "date-fns";
import { useEffect, useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Text } from "@/components/ui/typography";
import { MessageBubble } from "@/features/support/components/message-bubble";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface MessageSender {
  email?: string;
  id?: string;
  image?: string;
  name?: string;
}

interface Message {
  _id: Id<"supportMessages">;
  body: string;
  createdAt: number;
  isOwnMessage: boolean;
  isRead: boolean;
  sender?: MessageSender;
  senderId: string;
  senderType: "user" | "admin";
}

interface MessageListProps {
  className?: string;
  conversationId: Id<"supportConversations">;
  guestId?: string;
  messages: Message[] | undefined;
}

const GROUPING_WINDOW_MS = 5 * 60 * 1000;

function formatDateHeader(timestamp: number): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return "Today";
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  return format(date, "MMMM d, yyyy");
}

function groupMessagesByDate(messages: Message[]): [string, Message[]][] {
  const groups = new Map<string, Message[]>();

  for (const message of messages) {
    const dateKey = format(new Date(message.createdAt), "yyyy-MM-dd");
    const group = groups.get(dateKey) ?? [];
    group.push(message);
    groups.set(dateKey, group);
  }

  return [...groups].sort(([a], [b]) => a.localeCompare(b));
}

function shouldShowAvatar(
  message: Message,
  previousMessage: Message | undefined
): boolean {
  if (!previousMessage) {
    return true;
  }

  if (previousMessage.senderId !== message.senderId) {
    return true;
  }

  return message.createdAt - previousMessage.createdAt > GROUPING_WINDOW_MS;
}

export function MessageList({
  messages,
  conversationId,
  guestId,
  className,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const reactionsData = useQuery(api.support.messages.listReactions, {
    conversationId,
    guestId,
  });

  const addReaction = useMutation(api.support.messages.addReaction);
  const removeReaction = useMutation(api.support.messages.removeReaction);

  const reactionsByMessage = new Map(
    reactionsData?.map((item) => [item.messageId, item.reactions])
  );

  const messagesLength = messages?.length ?? 0;

  useEffect(() => {
    if (messagesLength > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesLength]);

  if (!messages) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <span className="text-sm">Loading messages...</span>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ChatCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <Text variant="label">No messages yet</Text>
            <Text className="mt-0.5" variant="caption">
              Start the conversation by sending a message
            </Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="flex flex-col gap-4 p-4">
        {groupMessagesByDate(messages).map(([dateKey, dayMessages]) => (
          <div className="flex flex-col gap-3" key={dateKey}>
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-muted px-3 py-1">
                <span className="font-medium text-muted-foreground text-xs">
                  {formatDateHeader(dayMessages[0].createdAt)}
                </span>
              </div>
            </div>

            {dayMessages.map((message, index) => {
              const showAvatar = shouldShowAvatar(
                message,
                index > 0 ? dayMessages[index - 1] : undefined
              );

              return (
                <MessageBubble
                  body={message.body}
                  currentUserId={currentUserId}
                  isOwnMessage={message.isOwnMessage}
                  key={message._id}
                  messageId={message._id}
                  onAddReaction={
                    currentUserId
                      ? (messageId, emoji) => addReaction({ emoji, messageId })
                      : undefined
                  }
                  onRemoveReaction={
                    currentUserId
                      ? (messageId) => removeReaction({ messageId })
                      : undefined
                  }
                  reactions={reactionsByMessage.get(message._id) ?? []}
                  sender={message.sender}
                  senderType={message.senderType}
                  showAvatar={showAvatar}
                  showTimestamp={showAvatar}
                  timestamp={message.createdAt}
                />
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
