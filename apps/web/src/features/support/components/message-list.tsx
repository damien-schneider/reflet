"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ChatCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format, isToday, isYesterday } from "date-fns";
import { useEffect, useRef } from "react";
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
const PINNED_TO_BOTTOM_THRESHOLD_PX = 80;
const SKELETON_BUBBLES = [
  { id: "a", isOwn: false, width: "w-2/3" },
  { id: "b", isOwn: true, width: "w-1/2" },
  { id: "c", isOwn: false, width: "w-3/5" },
] as const;

function MessageListSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-4 p-4", className)}
      role="status"
    >
      <span className="sr-only">Loading messages…</span>
      {SKELETON_BUBBLES.map((bubble) => (
        <div
          aria-hidden
          className={cn(
            "flex gap-2.5",
            bubble.isOwn ? "flex-row-reverse" : "flex-row"
          )}
          key={bubble.id}
        >
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className={cn("h-12 rounded-2xl", bubble.width)} />
        </div>
      ))}
    </div>
  );
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const isPinnedToBottomRef = useRef(true);

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
  const lastMessageIsOwn = messages?.at(-1)?.isOwnMessage ?? false;

  useEffect(() => {
    const viewport = viewportRef.current;
    const shouldFollow = isPinnedToBottomRef.current || lastMessageIsOwn;
    if (viewport && messagesLength > 0 && shouldFollow) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messagesLength, lastMessageIsOwn]);

  if (!messages) {
    return <MessageListSkeleton className={className} />;
  }

  if (messages.length === 0) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <ChatCircle aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No messages yet</EmptyTitle>
            <EmptyDescription>
              Send a message to start the conversation.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <ScrollArea
      className={cn("flex-1", className)}
      viewportProps={{
        onScroll: (event) => {
          const viewport = event.currentTarget;
          isPinnedToBottomRef.current =
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
            PINNED_TO_BOTTOM_THRESHOLD_PX;
        },
      }}
      viewportRef={viewportRef}
    >
      <div aria-label="Messages" className="flex flex-col gap-4 p-4" role="log">
        {groupMessagesByDate(messages).map(([dateKey, dayMessages]) => (
          <section
            aria-label={formatDateHeader(dayMessages[0].createdAt)}
            className="flex flex-col gap-3"
            key={dateKey}
          >
            <div className="flex items-center justify-center">
              <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground text-xs">
                {formatDateHeader(dayMessages[0].createdAt)}
              </span>
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
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}
