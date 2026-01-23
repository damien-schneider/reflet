"use client";

import { ChatCircle } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format, isToday, isYesterday } from "date-fns";
import { useEffect, useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Text } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import { MessageBubble } from "./message-bubble";

interface MessageSender {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
}

interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

interface Message {
  _id: string;
  senderId: string;
  senderType: "user" | "admin";
  body: string;
  isRead: boolean;
  createdAt: number;
  sender?: MessageSender;
  isOwnMessage: boolean;
}

interface MessageListProps {
  messages: Message[] | undefined;
  isLoading?: boolean;
  className?: string;
}

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

function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const groups: Record<string, Message[]> = {};

  for (const message of messages) {
    const dateKey = format(new Date(message.createdAt), "yyyy-MM-dd");

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(message);
  }

  return groups;
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

  const timeDiff = message.createdAt - previousMessage.createdAt;
  const fiveMinutes = 5 * 60 * 1000;

  return timeDiff > fiveMinutes;
}

export function MessageList({
  messages,
  isLoading,
  className,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const messageIds = messages?.map((m) => m._id) ?? [];

  const reactionsData = useQuery(
    api.support_messages.listReactions,
    messageIds.length > 0
      ? { messageIds: messageIds as Id<"supportMessages">[] }
      : "skip"
  );

  const addReaction = useMutation(api.support_messages.addReaction);
  const removeReaction = useMutation(api.support_messages.removeReaction);

  const reactionsMap = reactionsData?.reduce(
    (acc, item) => {
      acc[item.messageId] = item.reactions;
      return acc;
    },
    {} as Record<string, MessageReaction[]>
  );

  const handleAddReaction = (messageId: string, emoji: string) => {
    addReaction({ messageId: messageId as Id<"supportMessages">, emoji });
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    removeReaction({ messageId: messageId as Id<"supportMessages">, emoji });
  };

  const messagesLength = messages?.length ?? 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesLength]);

  if (isLoading) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <span className="text-sm">Loading messages...</span>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
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

  const groupedMessages = groupMessagesByDate(messages);
  const dateKeys = Object.keys(groupedMessages).sort();

  return (
    <ScrollArea className={cn("flex-1", className)} ref={scrollRef}>
      <div className="flex flex-col gap-4 p-4">
        {dateKeys.map((dateKey) => {
          const dayMessages = groupedMessages[dateKey];
          const firstMessage = dayMessages[0];

          return (
            <div className="flex flex-col gap-3" key={dateKey}>
              <div className="flex items-center justify-center">
                <div className="rounded-full bg-muted px-3 py-1">
                  <span className="font-medium text-muted-foreground text-xs">
                    {formatDateHeader(firstMessage.createdAt)}
                  </span>
                </div>
              </div>

              {dayMessages.map((message, index) => {
                const previousMessage =
                  index > 0 ? dayMessages[index - 1] : undefined;
                const showAvatar = shouldShowAvatar(message, previousMessage);
                const messageReactions = reactionsMap?.[message._id] ?? [];

                return (
                  <MessageBubble
                    body={message.body}
                    currentUserId={currentUserId}
                    isOwnMessage={message.isOwnMessage}
                    key={message._id}
                    messageId={message._id}
                    onAddReaction={handleAddReaction}
                    onRemoveReaction={handleRemoveReaction}
                    reactions={messageReactions}
                    sender={message.sender}
                    senderType={message.senderType}
                    showAvatar={showAvatar}
                    showTimestamp={showAvatar}
                    timestamp={message.createdAt}
                  />
                );
              })}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
