"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

interface MessageBubbleProps {
  body: string;
  sender?: MessageSender;
  isOwnMessage: boolean;
  senderType: "user" | "admin";
  timestamp?: number;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  messageId?: string;
  reactions?: MessageReaction[];
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  currentUserId?: string;
}

const INITIALS_SPLIT_PATTERN = /[\s@]/;

function getInitials(name?: string, email?: string): string {
  const source = name || email || "?";
  return source
    .split(INITIALS_SPLIT_PATTERN)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function MessageBubble({
  body,
  sender,
  isOwnMessage,
  senderType,
  timestamp,
  showAvatar = true,
  showTimestamp = false,
  messageId,
  reactions = [],
  onAddReaction,
  onRemoveReaction,
  currentUserId,
}: MessageBubbleProps) {
  const initials = getInitials(sender?.name, sender?.email);
  const displayName = sender?.name || sender?.email || "Unknown";

  const handleReactionClick = (emoji: string) => {
    if (!(messageId && onAddReaction && onRemoveReaction)) {
      return;
    }

    const reaction = reactions.find((r) => r.emoji === emoji);
    const hasUserReacted = reaction?.userIds.includes(currentUserId ?? "");

    if (hasUserReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  return (
    <div
      className={cn(
        "group flex w-full gap-2.5",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
    >
      {showAvatar ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage alt={displayName} src={sender?.image} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isOwnMessage ? "items-end" : "items-start"
        )}
      >
        {showAvatar && (
          <span
            className={cn(
              "text-muted-foreground text-xs",
              isOwnMessage ? "text-right" : "text-left"
            )}
          >
            {isOwnMessage ? "You" : displayName}
            {senderType === "admin" && !isOwnMessage && (
              <span className="ml-1 text-olive-600 dark:text-olive-400">
                (Support)
              </span>
            )}
          </span>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isOwnMessage
              ? "rounded-br-md bg-olive-600 text-olive-50 dark:bg-olive-500"
              : "rounded-bl-md bg-muted text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{body}</p>

          {messageId && onAddReaction && reactions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {reactions.map((reaction) => {
                const hasUserReacted = reaction.userIds.includes(
                  currentUserId ?? ""
                );
                return (
                  <button
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                      isOwnMessage
                        ? "bg-olive-700/50 hover:bg-olive-700/70"
                        : "bg-muted-foreground/10 hover:bg-muted-foreground/20",
                      hasUserReacted &&
                        (isOwnMessage
                          ? "ring-2 ring-olive-400"
                          : "ring-2 ring-olive-600")
                    )}
                    key={reaction.emoji}
                    onClick={() => handleReactionClick(reaction.emoji)}
                    type="button"
                  >
                    <span>{reaction.emoji}</span>
                    <span className="font-medium">{reaction.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {messageId && onAddReaction && (
            <button
              className={cn(
                "mt-2 flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-xs transition-colors",
                isOwnMessage
                  ? "bg-olive-700/50 hover:bg-olive-700/70"
                  : "bg-muted-foreground/10 hover:bg-muted-foreground/20"
              )}
              onClick={() => handleReactionClick("👍")}
              type="button"
            >
              <span>👍</span>
              <span className="text-muted-foreground">React</span>
            </button>
          )}
        </div>

        {showTimestamp && timestamp && (
          <span className="text-[10px] text-muted-foreground/70">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
