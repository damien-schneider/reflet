"use client";

import {
  ChatMessage,
  ChatMessageActions,
  ChatMessageAvatar,
  ChatMessageBody,
  ChatMessageContent,
  ChatMessageHeader,
  ChatMessageRow,
} from "@ctrl-ui/react/chat-message";
import { cn } from "@ctrl-ui/react/lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Toggle } from "@ctrl-ui/react/ui/toggle";
import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { format } from "date-fns";
import { MessageAttachments } from "@/features/support/components/thread/message-attachments";
import { MessageEmailMeta } from "@/features/support/components/thread/message-email";
import { getInitials } from "@/lib/initials";

export type SupportMessageData = FunctionReturnType<
  typeof api.support.messages.list
>[number];

type MessageReactions = FunctionReturnType<
  typeof api.support.messages.listReactions
>[number]["reactions"];

const QUICK_REACTION = "👍";

interface SupportMessageProps {
  message: SupportMessageData;
  reactions: {
    list: MessageReactions;
    onToggle?: (emoji: string) => void;
    viewerId?: string;
  };
  startsBurst: boolean;
}

export function SupportMessage({
  message,
  reactions,
  startsBurst,
}: SupportMessageProps) {
  const isOwn = message.isOwnMessage;
  const { sender } = message;
  const senderName = sender?.name || sender?.email || "Unknown";
  const authorLabel = isOwn ? "You" : senderName;
  const showsAvatar = startsBurst && !isOwn;
  const isAutomaticReply =
    message.email?.direction === "inbound" && message.email.autoSubmitted;

  return (
    <ChatMessage
      aria-label={`${authorLabel}, ${format(message.createdAt, "PPpp")}`}
      density="compact"
      from={isOwn ? "user" : "assistant"}
    >
      <ChatMessageRow className={cn(!(isOwn || showsAvatar) && "ps-8")}>
        {showsAvatar && (
          <ChatMessageAvatar>
            <Avatar className="size-full">
              <AvatarImage alt="" src={sender?.image} />
              <AvatarFallback>
                {getInitials(sender?.name, sender?.email)}
              </AvatarFallback>
            </Avatar>
          </ChatMessageAvatar>
        )}
        <ChatMessageBody>
          {startsBurst && (
            <ChatMessageHeader className={cn(isOwn && "justify-end")}>
              <span className="font-medium text-foreground">{authorLabel}</span>
              {message.senderType === "admin" && !isOwn && (
                <Badge color="blue" size="sm">
                  Support
                </Badge>
              )}
              <time
                dateTime={new Date(message.createdAt).toISOString()}
                title={format(message.createdAt, "PPpp")}
              >
                {format(message.createdAt, "h:mm a")}
              </time>
            </ChatMessageHeader>
          )}
          <ChatMessageContent className="whitespace-pre-wrap">
            {isAutomaticReply ? (
              <details>
                <summary className="cursor-pointer text-muted-foreground">
                  Automatic reply
                </summary>
                {message.body}
              </details>
            ) : (
              message.body
            )}
          </ChatMessageContent>
          <MessageAttachments attachments={message.attachments} isOwn={isOwn} />
          {message.email && (
            <MessageEmailMeta
              email={message.email}
              isOwn={isOwn}
              messageId={message._id}
            />
          )}
          <ReactionBar isOwn={isOwn} reactions={reactions} />
        </ChatMessageBody>
      </ChatMessageRow>
    </ChatMessage>
  );
}

function ReactionBar({
  isOwn,
  reactions,
}: {
  isOwn: boolean;
  reactions: SupportMessageProps["reactions"];
}) {
  const { list, onToggle, viewerId } = reactions;
  const hasQuickReaction = list.some(
    (reaction) => reaction.emoji === QUICK_REACTION
  );

  if (!onToggle) {
    return list.length > 0 ? (
      <div className={cn("mt-1 flex gap-1", isOwn && "justify-end")}>
        {list.map((reaction) => (
          <Badge key={reaction.emoji} size="sm">
            {reaction.emoji} {reaction.count}
          </Badge>
        ))}
      </div>
    ) : null;
  }

  return (
    <div className={cn("mt-1 flex items-center gap-1", isOwn && "justify-end")}>
      {list.map((reaction) => (
        <Toggle
          aria-label={`${reaction.emoji} ${reaction.count}`}
          key={reaction.emoji}
          onPressedChange={() => onToggle(reaction.emoji)}
          pressed={
            viewerId !== undefined && reaction.userIds.includes(viewerId)
          }
          size="xs"
          value={reaction.emoji}
        >
          <span aria-hidden>{reaction.emoji}</span>
          <span className="tabular-nums">{reaction.count}</span>
        </Toggle>
      ))}
      {!hasQuickReaction && (
        <ChatMessageActions className="mt-0">
          <Button
            aria-label={`React with ${QUICK_REACTION}`}
            iconOnly
            onClick={() => onToggle(QUICK_REACTION)}
            size="xs"
            variant="ghost"
          >
            <span aria-hidden>{QUICK_REACTION}</span>
          </Button>
        </ChatMessageActions>
      )}
    </div>
  );
}
